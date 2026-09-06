import React from 'react';
import { 
  X, 
  MapPin, 
  CheckCircle2, 
  Star, 
  Briefcase, 
  ExternalLink, 
  Award, 
  Sparkles, 
  Calendar,
  Send,
  Linkedin,
  ShieldCheck
} from 'lucide-react';
import { ServiceProvider } from '../types';

interface ProviderProfileModalProps {
  provider: ServiceProvider | null;
  isOpen: boolean;
  onClose: () => void;
  onRequestService: (provider: ServiceProvider) => void;
}

export const ProviderProfileModal: React.FC<ProviderProfileModalProps> = ({
  provider,
  isOpen,
  onClose,
  onRequestService,
}) => {
  if (!isOpen || !provider) return null;

  const availabilityBadge = {
    available: { label: 'Available for Projects', bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' },
    part_time: { label: 'Limited / Part-Time Availability', bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30' },
    busy: { label: 'Currently Booked', bg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30' },
    unavailable: { label: 'Unavailable', bg: 'bg-slate-500/10 text-slate-500 border-slate-500/30' },
  }[provider.availability || 'available'];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl text-left relative my-8 overflow-hidden">
        
        {/* Banner Header */}
        <div className="h-32 bg-gradient-to-r from-blue-900 via-slate-900 to-slate-950 relative p-6">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold border border-blue-500/30">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Approved Nigeria Expert • Vetted by Nexovira Management</span>
          </div>
        </div>

        {/* Profile Card Body */}
        <div className="p-6 pt-0 space-y-6">
          {/* Avatar and Top Meta */}
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 -mt-12">
            <div className="flex items-end gap-4">
              <div className="relative">
                <img
                  src={provider.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80'}
                  alt={provider.name}
                  className="w-24 h-24 rounded-2xl object-cover border-4 border-white dark:border-slate-900 shadow-xl"
                />
                {provider.verifiedByManagement && (
                  <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-blue-600 text-white shadow" title="Vetted by Management">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span>{provider.name}</span>
                </h3>
                <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                  {provider.title}
                </p>
                <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    <span>{provider.location || 'Nigeria'}</span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-amber-500 font-bold">
                    <Star className="w-3 h-3 fill-current" />
                    <span>{provider.rating?.toFixed(2) || '5.0'}</span>
                  </span>
                  <span>•</span>
                  <span>{provider.completedProjectsCount || 20}+ projects completed</span>
                </div>
              </div>
            </div>

            {/* Availability Pill */}
            <div className={`px-3 py-1.5 rounded-xl border text-xs font-bold ${availabilityBadge.bg}`}>
              {availabilityBadge.label}
            </div>
          </div>

          {/* Bio & Experience */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
              Professional Biography
            </h4>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              {provider.bio}
            </p>
            {provider.experienceSummary && (
              <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-start gap-3">
                <Award className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="font-bold text-slate-900 dark:text-white">
                    {provider.experienceYears} Years Verified Track Record:
                  </span>{' '}
                  <span className="text-slate-600 dark:text-slate-400">
                    {provider.experienceSummary}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Skills Badges */}
          {provider.skills && provider.skills.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                Core Competencies & Skills
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {provider.skills.map((skill, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-semibold"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Portfolio & Sample Works */}
          {provider.portfolio && provider.portfolio.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center justify-between">
                <span>Verified Work Samples & Portfolio</span>
                <span className="text-[10px] text-slate-500 font-normal lowercase">Vetted by management</span>
              </h4>
              <div className="space-y-2">
                {provider.portfolio.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between gap-3 hover:border-blue-300 dark:hover:border-blue-800 transition-colors"
                  >
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-slate-900 dark:text-white">
                        {item.title}
                      </p>
                      {item.description && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {item.description}
                        </p>
                      )}
                    </div>
                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 shrink-0"
                        title="View Work Sample"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* LinkedIn Profile (Optional & Consent-Based) */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#0A66C2]/10 text-[#0A66C2] flex items-center justify-center font-bold">
                <Linkedin className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <p className="font-bold text-slate-900 dark:text-white">
                  Professional Network
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {provider.linkedInUrl && provider.hasAuthorizedLinkedIn
                    ? 'Provider has authorized public LinkedIn profile access'
                    : 'Optional profile verification on file with management'}
                </p>
              </div>
            </div>

            {provider.linkedInUrl && provider.hasAuthorizedLinkedIn ? (
              <a
                href={provider.linkedInUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0A66C2] hover:bg-[#004182] text-white text-xs font-bold shadow-sm transition-colors"
              >
                <span>View LinkedIn</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            ) : (
              <span className="text-[11px] text-slate-400 italic">
                Optional
              </span>
            )}
          </div>

          {/* Management Escrow Notice & Book Action */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Management guarantees milestone delivery before funds release</span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="w-1/3 sm:w-auto px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onRequestService(provider);
                }}
                className="w-2/3 sm:w-auto px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-all"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Discuss with Management</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
