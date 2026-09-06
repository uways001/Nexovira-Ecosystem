import React from 'react';
import { 
  X, 
  ArrowRight, 
  CheckCircle2, 
  Layers, 
  Sparkles,
  Code2,
  Smartphone,
  Cloud,
  ShieldAlert,
  Layout,
  Palette,
  BarChart3,
  TrendingUp,
  FileText
} from 'lucide-react';
import { TechServiceCategory, SubExpertise } from '../../data/techServicesCategories';

interface CategoryModalProps {
  category: TechServiceCategory | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectExpertise: (category: TechServiceCategory, subExpertise?: SubExpertise) => void;
}

const ICON_MAP: Record<string, any> = {
  Sparkles,
  Code2,
  Smartphone,
  Cloud,
  ShieldAlert,
  Layout,
  Palette,
  BarChart3,
  TrendingUp,
  FileText
};

export const CategoryModal: React.FC<CategoryModalProps> = ({
  category,
  isOpen,
  onClose,
  onSelectExpertise
}) => {
  if (!isOpen || !category) return null;

  const IconComponent = ICON_MAP[category.iconName] || Code2;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div 
        className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl my-8 text-white max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-xl bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-start gap-4 pr-12 pb-6 border-b border-slate-800">
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shrink-0 shadow-inner">
            <IconComponent className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-cyan-400 tracking-wider uppercase bg-cyan-500/10 px-2.5 py-0.5 rounded-full border border-cyan-500/20">
                Managed Expertise Ecosystem
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white mt-1">
              {category.title}
            </h2>
            <p className="text-sm text-slate-400 mt-1 leading-relaxed">
              {category.fullDescription}
            </p>
          </div>
        </div>

        {/* Prompt headline */}
        <div className="mt-6 mb-4 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span>What kind of {category.title} expertise do you need?</span>
          </h3>
          <span className="text-xs text-slate-500">{category.subExpertise.length} Specialized Tracks</span>
        </div>

        {/* Sub-expertise list */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {category.subExpertise.map((sub) => (
            <div
              key={sub.id}
              onClick={() => onSelectExpertise(category, sub)}
              className="group p-4 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-cyan-500/60 hover:bg-slate-800/50 transition-all cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-white group-hover:text-cyan-400 transition-colors">
                    {sub.name}
                  </h4>
                  <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all" />
                </div>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                  {sub.description}
                </p>
              </div>

              {/* Deliverables snippet */}
              <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap gap-1.5">
                {sub.typicalDeliverables.slice(0, 3).map((item, idx) => (
                  <span
                    key={idx}
                    className="text-[10px] bg-slate-900 text-slate-300 px-2 py-0.5 rounded-md border border-slate-800"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Action Footer */}
        <div className="mt-8 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Nexovira reviews every brief and pairs it with vetted specialists.</span>
          </div>

          <button
            onClick={() => onSelectExpertise(category)}
            className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-2"
          >
            <span>Describe Your Project in {category.title}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
