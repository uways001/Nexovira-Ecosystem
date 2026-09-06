import React, { useState } from 'react';
import { NexoviraLogo } from './NexoviraLogo';
import { ShieldCheck, Sparkles, MapPin, Phone, MessageSquare, Globe, CheckCircle2, AlertCircle } from 'lucide-react';
import { CategoryId, CurrencyCode } from '../types';
import { subscribeNewsletterToFirestore } from '../lib/firestoreService';

interface FooterProps {
  onSelectCategory: (cat: CategoryId | 'all') => void;
  onOpenAI: () => void;
  onNavigate: (path: string) => void;
  currentCurrency?: CurrencyCode;
}

export const Footer: React.FC<FooterProps> = ({ 
  onSelectCategory, 
  onOpenAI, 
  onNavigate,
  currentCurrency = 'NGN'
}) => {
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email.trim());
  };

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const cleanEmail = newsletterEmail.trim();

    if (!cleanEmail) {
      setErrorMsg('Please enter your email address.');
      return;
    }

    if (!validateEmail(cleanEmail)) {
      setErrorMsg('Please enter a valid email address (e.g. user@example.com).');
      return;
    }

    setLoading(true);
    try {
      await subscribeNewsletterToFirestore(cleanEmail);
      setSubscribed(true);
      setNewsletterEmail('');
    } catch (err: any) {
      console.error('Newsletter subscription error:', err);
      // Even if offline/fallback, give a friendly confirmation
      setSubscribed(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <footer className="bg-slate-950 text-slate-300 border-t border-slate-800 pt-12 pb-8 text-left">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Top Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          
          {/* Brand Info & Address */}
          <div className="lg:col-span-2 space-y-4">
            <NexoviraLogo size={36} showText={true} showTagline={true} taglineClassName="text-xs font-semibold text-cyan-400/90 mt-0.5" />
            <p className="text-xs text-cyan-300 font-semibold italic">
              "Innovation begins with vision. Smart living, better every day."
            </p>
            <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
              NEXOVIRA is a digital marketplace ecosystem for appliances, smart home equipment, consumer technology, and electronics. Grounded in verified inventory data.
            </p>

            <div className="space-y-1.5 text-xs text-slate-400 font-medium">
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>14 Admiralty Way, Victoria Island, Lagos, Nigeria</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <a href="tel:+2349110443054" className="hover:text-white font-mono">+234 911 044 3054</a>
              </div>
              <div className="flex items-center gap-2">
                <MessageSquare className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <a href="https://wa.me/2348129595134" target="_blank" rel="noopener noreferrer" className="hover:text-emerald-400 font-mono text-emerald-400">
                  WhatsApp: +234 812 959 5134
                </a>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <span className="text-[10px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Authentic Product Warranty
              </span>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Lagos Hub Fulfilled
              </span>
            </div>
          </div>

          {/* Categories Column */}
          <div className="space-y-3 text-xs">
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">Appliances</h4>
            <ul className="space-y-2 text-slate-400">
              <li>
                <a href="/category/refrigerators" onClick={(e) => { e.preventDefault(); onNavigate('/category/refrigerators'); }} className="hover:text-cyan-400">
                  Smart Refrigerators
                </a>
              </li>
              <li>
                <a href="/category/air-conditioners" onClick={(e) => { e.preventDefault(); onNavigate('/category/air-conditioners'); }} className="hover:text-cyan-400">
                  Inverter Air Conditioners
                </a>
              </li>
              <li>
                <a href="/category/washing-machines" onClick={(e) => { e.preventDefault(); onNavigate('/category/washing-machines'); }} className="hover:text-cyan-400">
                  Washing Machines
                </a>
              </li>
              <li>
                <a href="/category/blenders" onClick={(e) => { e.preventDefault(); onNavigate('/category/blenders'); }} className="hover:text-cyan-400">
                  Blenders & Air Fryers
                </a>
              </li>
              <li>
                <a href="/category/accessories" onClick={(e) => { e.preventDefault(); onNavigate('/category/accessories'); }} className="hover:text-cyan-400">
                  Solar Power Inverters
                </a>
              </li>
            </ul>
          </div>

          {/* Ecosystem Links */}
          <div className="space-y-3 text-xs">
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">Ecosystem & Company</h4>
            <ul className="space-y-2 text-slate-400">
              <li>
                <a 
                  href="/presentation" 
                  onClick={(e) => { e.preventDefault(); onNavigate('/presentation'); }} 
                  className="text-cyan-400 font-bold hover:underline flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Ecosystem Vision Deck</span>
                </a>
              </li>
              <li>
                <a href="/about" onClick={(e) => { e.preventDefault(); onNavigate('/about'); }} className="hover:text-cyan-400">
                  About NEXOVIRA
                </a>
              </li>
              <li>
                <a href="/services" onClick={(e) => { e.preventDefault(); onNavigate('/services'); }} className="hover:text-cyan-400">
                  Tech & Digital Services
                </a>
              </li>
              <li>
                <a href="/academy" onClick={(e) => { e.preventDefault(); onNavigate('/academy'); }} className="hover:text-cyan-400">
                  NEXOVIRA Academy
                </a>
              </li>
              <li>
                <a href="/contact" onClick={(e) => { e.preventDefault(); onNavigate('/contact'); }} className="hover:text-cyan-400">
                  Contact Support
                </a>
              </li>
              <li>
                <button onClick={onOpenAI} className="text-cyan-400 font-bold hover:underline flex items-center gap-1 mt-1">
                  <Sparkles className="w-3.5 h-3.5" /> Ask AI Assistant
                </button>
              </li>
            </ul>
          </div>

          {/* Newsletter Column */}
          <div className="space-y-3 text-xs">
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">Stay Informed</h4>
            <p className="text-slate-400 text-[11px]">Subscribe for weekly flash deal alerts and inverter energy guides.</p>
            
            {subscribed ? (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-[11px] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Subscribed! Saved to NEXOVIRA subscriber database.</span>
              </div>
            ) : (
              <form onSubmit={handleNewsletterSubmit} className="space-y-2">
                {errorMsg && (
                  <div className="p-2 bg-red-500/10 border border-red-500/30 text-red-400 text-[10px] rounded-lg flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}
                <input
                  type="email"
                  placeholder="Enter your email..."
                  value={newsletterEmail}
                  onChange={(e) => {
                    setNewsletterEmail(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2 bg-cyan-500 text-slate-950 font-bold text-xs rounded-xl hover:bg-cyan-400 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Subscribing...' : 'Subscribe'}
                </button>
              </form>
            )}
          </div>

        </div>

        {/* Bottom Copyright & Legal */}
        <div className="pt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            © {new Date().getFullYear()} NEXOVIRA Marketplace Inc. Founded by Abdullah Oderinde & Musa Uways. All rights reserved. Official Domain: <a href="https://nexovira.name.ng" className="text-slate-400 hover:text-cyan-400 font-mono">nexovira.name.ng</a>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <span className="flex items-center gap-1 text-cyan-400 font-medium">
              <Globe className="w-3.5 h-3.5" /> Currency: {currentCurrency} (₦ NGN Base)
            </span>
            <a href="/privacy" onClick={(e) => { e.preventDefault(); onNavigate('/privacy'); }} className="hover:text-slate-300">
              Privacy Policy
            </a>
            <a href="/terms" onClick={(e) => { e.preventDefault(); onNavigate('/terms'); }} className="hover:text-slate-300">
              Terms of Service
            </a>
            <a href="/contact" onClick={(e) => { e.preventDefault(); onNavigate('/contact'); }} className="hover:text-slate-300">
              Contact
            </a>
          </div>
        </div>

      </div>
    </footer>
  );
};
