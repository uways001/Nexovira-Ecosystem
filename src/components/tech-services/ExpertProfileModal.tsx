import React from 'react';
import { 
  X, 
  CheckCircle2, 
  Star, 
  ArrowRight, 
  ExternalLink, 
  ShieldCheck, 
  Briefcase, 
  Calendar,
  Layers
} from 'lucide-react';
import { ServiceProvider } from '../../types';

interface ExpertProfileModalProps {
  expert: ServiceProvider | null;
  isOpen: boolean;
  onClose: () => void;
  onRequestExpertise: (expert: ServiceProvider) => void;
}

export const ExpertProfileModal: React.FC<ExpertProfileModalProps> = ({
  expert,
  isOpen,
  onClose,
  onRequestExpertise
}) => {
  if (!isOpen || !expert) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div 
        className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl my-8 text-white max-h-[90vh] overflow-y-auto space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Profile Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 pb-6 border-b border-slate-800 pr-12">
          <img
            src={expert.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80'}
            alt={expert.name}
            className="w-20 h-20 rounded-2xl object-cover border-2 border-cyan-500/40 shadow-lg"
          />

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider bg-cyan-500/10 px-2.5 py-0.5 rounded-full border border-cyan-500/20">
                {expert.primaryExpertise || expert.specialization}
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                <ShieldCheck className="w-3 h-3" />
                <span>Vetted Specialist</span>
              </span>
            </div>

            <h2 className="text-2xl font-black text-white">
              {expert.professionalName || expert.name}
            </h2>
            <p className="text-xs text-slate-400 font-medium">
              {expert.title}
            </p>
          </div>
        </div>

        {/* Performance & Track Record Badges */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-center">
            <div className="flex items-center justify-center gap-1 text-amber-400 font-black text-sm">
              <Star className="w-4 h-4 fill-amber-400" />
              <span>{expert.rating?.toFixed(1) || '5.0'}</span>
            </div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5 block font-bold">Client Rating</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-center">
            <span className="text-sm font-black text-white">{expert.completedProjectsCount || 12}+</span>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5 block font-bold">Completed Projects</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-center">
            <span className="text-sm font-black text-cyan-400">{expert.experienceYears || 4} Years</span>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5 block font-bold">In Field</span>
          </div>
        </div>

        {/* Bio */}
        <div className="space-y-1.5">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Professional Bio</h4>
          <p className="text-xs sm:text-sm text-slate-300 bg-slate-950 p-4 rounded-xl leading-relaxed border border-slate-800">
            {expert.bio}
          </p>
        </div>

        {/* Technical Competencies */}
        {expert.skills && expert.skills.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Core Technical Competencies</h4>
            <div className="flex flex-wrap gap-1.5">
              {expert.skills.map((skill, idx) => (
                <span
                  key={idx}
                  className="text-xs font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-3 py-1 rounded-xl"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Portfolio / Verified Work */}
        {expert.portfolio && expert.portfolio.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Representative Case Studies</h4>
            <div className="space-y-2">
              {expert.portfolio.map((item, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <h5 className="font-bold text-xs text-white">{item.title}</h5>
                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-cyan-400 hover:underline text-[11px] flex items-center gap-1"
                      >
                        <span>View Project</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                  {item.description && (
                    <p className="text-[11px] text-slate-400 leading-relaxed">{item.description}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Nexovira Platform Safeguard Notice */}
        <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/30 text-xs text-slate-300 flex items-start gap-3">
          <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Managed Execution Guarantee:</strong> All communication, scoping, milestones, and payments are coordinated centrally through Nexovira to ensure quality execution and deliverable verification.
          </p>
        </div>

        {/* Action Button */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition-colors"
          >
            Close Profile
          </button>

          <button
            onClick={() => {
              onClose();
              onRequestExpertise(expert);
            }}
            className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-2"
          >
            <span>Request This Expertise</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
