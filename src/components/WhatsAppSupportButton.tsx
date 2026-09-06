import React from 'react';
import { MessageSquare, ExternalLink } from 'lucide-react';

interface WhatsAppSupportButtonProps {
  whatsappNumber?: string;
  defaultMessage?: string;
  variant?: 'floating' | 'inline' | 'hero';
}

export const WhatsAppSupportButton: React.FC<WhatsAppSupportButtonProps> = ({
  whatsappNumber = '+2348129595134',
  defaultMessage = 'Hello NEXOVIRA Support, I would like assistance with...',
  variant = 'inline',
}) => {
  const cleanNumber = whatsappNumber.replace(/[^0-9]/g, '');
  const encodedMsg = encodeURIComponent(defaultMessage);
  const whatsappUrl = `https://wa.me/${cleanNumber}?text=${encodedMsg}`;

  if (variant === 'floating') {
    return (
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 left-6 z-40 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-3 rounded-full shadow-2xl flex items-center gap-2.5 transition-all transform hover:scale-105 active:scale-95 group border border-emerald-400/40"
        title="Need Help? Chat on WhatsApp"
      >
        <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center shrink-0">
          <MessageSquare className="w-4 h-4 fill-current text-white" />
        </div>
        <div className="text-left hidden sm:block">
          <div className="text-[10px] text-emerald-100 font-normal leading-tight">Need Support?</div>
          <div className="text-xs font-black tracking-wide">Chat on WhatsApp</div>
        </div>
      </a>
    );
  }

  if (variant === 'hero') {
    return (
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-semibold text-xs transition-colors"
      >
        <MessageSquare className="w-3.5 h-3.5 fill-current text-emerald-400" />
        <span>Need Instant Help? Chat on WhatsApp</span>
        <ExternalLink className="w-3 h-3 text-emerald-400" />
      </a>
    );
  }

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-colors"
    >
      <MessageSquare className="w-4 h-4 fill-current" />
      <span>WhatsApp Assistance</span>
    </a>
  );
};
