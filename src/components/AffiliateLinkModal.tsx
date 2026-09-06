import React, { useState } from 'react';
import { Share2, Copy, Check, ExternalLink, ShieldCheck, X, Sparkles, Link as LinkIcon } from 'lucide-react';
import { buildAffiliateDeepLink, copyToClipboard, getCurrentPublicOrigin } from '../lib/domainConfig';
import { createOrGetAffiliateLinkInFirestore } from '../lib/firestoreService';

interface AffiliateLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  affiliateUid: string;
  affiliateCode: string;
  item: {
    id: string;
    title: string;
    contentType: 'PRODUCT' | 'SERVICE' | 'COURSE' | 'EBOOK' | 'CUSTOM';
    targetPath: string;
    commissionRate?: number;
    price?: number;
  };
}

export const AffiliateLinkModal: React.FC<AffiliateLinkModalProps> = ({
  isOpen,
  onClose,
  affiliateUid,
  affiliateCode,
  item
}) => {
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen) return null;

  const cleanCode = (affiliateCode || 'AFF').trim().toUpperCase();
  const linkId = `${cleanCode}_${item.contentType}_${item.id}`.replace(/[^a-zA-Z0-9_]/g, '_');
  const generatedUrl = buildAffiliateDeepLink({
    affiliateCode: cleanCode,
    targetPath: item.targetPath,
    linkId
  });

  const handleCopy = async () => {
    setIsGenerating(true);
    try {
      // Record/Get link in Firestore
      await createOrGetAffiliateLinkInFirestore(
        affiliateUid,
        cleanCode,
        item.id,
        item.title,
        item.contentType,
        item.targetPath
      );
      const ok = await copyToClipboard(generatedUrl);
      if (ok) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch (e) {
      console.error('Copy link error:', e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleOpenLink = async () => {
    try {
      await createOrGetAffiliateLinkInFirestore(
        affiliateUid,
        cleanCode,
        item.id,
        item.title,
        item.contentType,
        item.targetPath
      );
    } catch (_) {}
    window.open(generatedUrl, '_blank', 'noopener,noreferrer');
  };

  const currentDomain = getCurrentPublicOrigin();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-rose-900/40 rounded-3xl p-6 sm:p-8 max-w-lg w-full text-left space-y-6 shadow-2xl relative text-white">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Badge */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 text-xs font-bold border border-rose-500/30">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Official Affiliate Deep-Link</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white">
            Promote & Earn Commission
          </h2>
          <p className="text-xs sm:text-sm text-slate-300">
            Share this trackable deep-link with your audience. Any customer who clicks and completes a purchase earns you direct commissions.
          </p>
        </div>

        {/* Item Summary Card */}
        <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-rose-400">
              {item.contentType}
            </span>
            {item.commissionRate !== undefined && item.commissionRate > 0 && (
              <span className="text-xs font-bold text-emerald-400">
                {item.commissionRate}% Commission Rate
              </span>
            )}
          </div>
          <h4 className="text-sm font-bold text-white line-clamp-2">{item.title}</h4>
          <p className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
            <LinkIcon className="w-3 h-3 text-slate-500" />
            <span>Destination: {item.targetPath}</span>
          </p>
        </div>

        {/* Generated Link Field */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
            Your Trackable Affiliate URL
          </label>
          <div className="relative">
            <input
              type="text"
              readOnly
              value={generatedUrl}
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3.5 text-xs text-rose-300 font-mono focus:outline-none pr-10 select-all"
            />
            <div className="absolute right-3 top-3.5 text-slate-500">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
          <p className="text-[11px] text-slate-400">
            Auto-detected domain: <span className="text-slate-200 font-mono">{currentDomain}</span>
          </p>
        </div>

        {/* Action Buttons: Copy Link & Open Link */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <button
            onClick={handleCopy}
            disabled={isGenerating}
            className={`w-full py-3.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg ${
              copied
                ? 'bg-emerald-600 text-white shadow-emerald-500/20'
                : 'bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white shadow-rose-500/20'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 animate-bounce" />
                <span>Link Copied ✓</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copy Link</span>
              </>
            )}
          </button>

          <button
            onClick={handleOpenLink}
            className="w-full py-3.5 px-4 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <ExternalLink className="w-4 h-4 text-rose-400" />
            <span>Open Link (Test)</span>
          </button>
        </div>

        <div className="text-[11px] text-slate-400 text-center pt-1 border-t border-slate-800/60">
          First-party cookie attribution window: <span className="text-white font-semibold">30 Days</span> (Last-click attribution rule)
        </div>

      </div>
    </div>
  );
};
