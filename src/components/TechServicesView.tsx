import React, { useState, useEffect, useRef } from 'react';
import { 
  Code2, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  Star, 
  ShieldCheck, 
  Send, 
  Search, 
  Layers, 
  UserCheck, 
  UserPlus, 
  Briefcase, 
  Clock, 
  HelpCircle, 
  Cpu, 
  Smartphone, 
  Cloud, 
  ShieldAlert, 
  Layout, 
  Palette, 
  BarChart3, 
  TrendingUp, 
  FileText,
  DollarSign,
  ChevronRight,
  RefreshCw,
  Award
} from 'lucide-react';
import { CurrencyCode, ServiceProvider, ServiceRequest } from '../types';
import { 
  TECH_SERVICE_CATEGORIES, 
  PROMPT_EXAMPLE_CHIPS, 
  TechServiceCategory, 
  SubExpertise 
} from '../data/techServicesCategories';
import { 
  getServiceProvidersFromFirestore, 
  getTechServiceCategoriesFromFirestore 
} from '../lib/firestoreService';
import { useAuth } from '../context/AuthContext';

// Sub-components
import { CategoryModal } from './tech-services/CategoryModal';
import { ProjectRequestWizard } from './tech-services/ProjectRequestWizard';
import { CustomerRequestsDashboard } from './tech-services/CustomerRequestsDashboard';
import { ExpertApplicationModal } from './tech-services/ExpertApplicationModal';
import { ExpertPortalView } from './tech-services/ExpertPortalView';
import { ExpertProfileModal } from './tech-services/ExpertProfileModal';
import { AdminTechServicesManager } from './tech-services/AdminTechServicesManager';
import { NigeriaServicesView } from './NigeriaServicesView';

export type TechServicesActiveTab = 'overview' | 'categories' | 'request' | 'book-service' | 'how-it-works' | 'my-requests' | 'expert-portal' | 'admin-manager';

interface TechServicesViewProps {
  currentCurrency: CurrencyCode;
  initialTab?: TechServicesActiveTab;
  onNavigateToNigeriaHub?: () => void;
  onNavigateToAdminDashboard?: () => void;
  onNavigateHome?: () => void;
}

type ActiveTab = TechServicesActiveTab;

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

export const TechServicesView: React.FC<TechServicesViewProps> = ({
  currentCurrency,
  initialTab,
  onNavigateToNigeriaHub,
  onNavigateToAdminDashboard,
  onNavigateHome
}) => {
  const { user, userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>(initialTab || 'overview');

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Hero AI Search Bar State
  const [heroPrompt, setHeroPrompt] = useState<string>('');
  const [isAnalyzingPrompt, setIsAnalyzingPrompt] = useState<boolean>(false);
  const [aiQuickAnalysis, setAiQuickAnalysis] = useState<any | null>(null);

  // Modal States
  const [selectedCategory, setSelectedCategory] = useState<TechServiceCategory | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState<boolean>(false);

  const [wizardCategory, setWizardCategory] = useState<TechServiceCategory | null>(null);
  const [wizardSubExpertise, setWizardSubExpertise] = useState<SubExpertise | null>(null);
  const [wizardInitialPrompt, setWizardInitialPrompt] = useState<string>('');

  const [isExpertAppModalOpen, setIsExpertAppModalOpen] = useState<boolean>(false);
  const [selectedExpertForProfile, setSelectedExpertForProfile] = useState<ServiceProvider | null>(null);

  // Vetted Providers Showcase
  const [vettedProviders, setVettedProviders] = useState<ServiceProvider[]>([]);
  const [loadingProviders, setLoadingProviders] = useState<boolean>(true);

  // Dynamic Categories from Firestore
  const [categories, setCategories] = useState<TechServiceCategory[]>(TECH_SERVICE_CATEGORIES);

  // Load dynamic categories
  const loadCategories = async () => {
    try {
      const data = await getTechServiceCategoriesFromFirestore();
      if (data && data.length > 0) {
        setCategories(data);
      }
    } catch (err) {
      console.warn('Failed to load dynamic categories:', err);
    }
  };

  // Load vetted providers for showcase
  const loadProviders = async () => {
    setLoadingProviders(true);
    try {
      const data = await getServiceProvidersFromFirestore();
      setVettedProviders(data);
    } catch (err) {
      console.warn('Failed to load vetted specialists:', err);
    } finally {
      setLoadingProviders(false);
    }
  };

  useEffect(() => {
    loadProviders();
    loadCategories();

    const handleCatsChanged = () => {
      loadCategories();
    };
    const handleProvidersChanged = () => {
      loadProviders();
    };

    window.addEventListener('nexovira:tech-categories-changed', handleCatsChanged);
    window.addEventListener('nexovira:providers-changed', handleProvidersChanged);
    return () => {
      window.removeEventListener('nexovira:tech-categories-changed', handleCatsChanged);
      window.removeEventListener('nexovira:providers-changed', handleProvidersChanged);
    };
  }, []);

  // Handle Quick AI Analysis on Hero Prompt Submit
  const handleAnalyzeHeroPrompt = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!heroPrompt.trim()) return;

    setIsAnalyzingPrompt(true);
    try {
      const response = await fetch('/api/v1/tech-services/ai-analyze-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: heroPrompt })
      });

      if (response.ok) {
        const json = await response.json();
        setAiQuickAnalysis(json.data);
      } else {
        // Direct jump to wizard if backend error
        launchProjectWizard(undefined, undefined, heroPrompt);
      }
    } catch (err) {
      launchProjectWizard(undefined, undefined, heroPrompt);
    } finally {
      setIsAnalyzingPrompt(false);
    }
  };

  // Launch Project Wizard with prefilled parameters
  const launchProjectWizard = (category?: TechServiceCategory, subExpertise?: SubExpertise, prompt?: string) => {
    if (category) setWizardCategory(category);
    if (subExpertise) setWizardSubExpertise(subExpertise);
    if (prompt) setWizardInitialPrompt(prompt);
    setActiveTab('request');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // When user clicks a category card
  const handleOpenCategory = (cat: TechServiceCategory) => {
    setSelectedCategory(cat);
    setIsCategoryModalOpen(true);
  };

  // When user selects a sub-expertise in the category modal
  const handleSelectSubExpertise = (cat: TechServiceCategory, sub?: SubExpertise) => {
    setIsCategoryModalOpen(false);
    launchProjectWizard(cat, sub);
  };

  return (
    <div className="min-h-screen bg-[#07090E] text-slate-100 text-left">
      
      {/* Top Section Ecosystem Header & Sub-Navigation */}
      <div className="border-b border-slate-800/80 bg-slate-950/60 sticky top-0 z-30 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 py-3.5">
            {/* Title & Badge */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center font-bold">
                <Code2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">
                    Nexovira Ecosystem
                  </span>
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.2 rounded-full">
                    Managed
                  </span>
                </div>
                <h1 className="text-base sm:text-lg font-black text-white leading-tight">
                  TECH & DIGITAL SERVICES
                </h1>
              </div>
            </div>

            {/* Sub-Navigation Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 text-xs font-bold scrollbar-none">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
                  activeTab === 'overview'
                    ? 'bg-cyan-500 text-slate-950 font-black shadow-md shadow-cyan-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                Overview
              </button>

              <button
                onClick={() => setActiveTab('categories')}
                className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
                  activeTab === 'categories'
                    ? 'bg-cyan-500 text-slate-950 font-black shadow-md shadow-cyan-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                Explore Expertise
              </button>

              <button
                onClick={() => setActiveTab('book-service')}
                className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  activeTab === 'book-service'
                    ? 'bg-blue-600 text-white font-black shadow-md shadow-blue-600/30 ring-1 ring-blue-400'
                    : 'text-blue-400 hover:text-white hover:bg-slate-900 border border-blue-500/30'
                }`}
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span>Book a Service (On-Site &amp; Domestic Hub)</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.2 rounded font-bold">🇳🇬</span>
              </button>

              <button
                onClick={() => {
                  setWizardCategory(null);
                  setWizardSubExpertise(null);
                  setWizardInitialPrompt('');
                  setActiveTab('request');
                }}
                className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
                  activeTab === 'request'
                    ? 'bg-cyan-500 text-slate-950 font-black shadow-md shadow-cyan-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                Describe Your Project
              </button>

              <button
                onClick={() => setActiveTab('how-it-works')}
                className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
                  activeTab === 'how-it-works'
                    ? 'bg-cyan-500 text-slate-950 font-black shadow-md shadow-cyan-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                How It Works
              </button>

              <button
                onClick={() => setActiveTab('my-requests')}
                className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
                  activeTab === 'my-requests'
                    ? 'bg-cyan-500 text-slate-950 font-black shadow-md shadow-cyan-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                My Service Requests
              </button>

              <button
                onClick={() => setActiveTab('expert-portal')}
                className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
                  activeTab === 'expert-portal'
                    ? 'bg-cyan-500 text-slate-950 font-black shadow-md shadow-cyan-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                Specialist Workspace
              </button>

              {(userProfile?.role === 'admin' || user?.email === 'nexoviratech@gmail.com') && (
                <button
                  onClick={() => setActiveTab('admin-manager')}
                  className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    activeTab === 'admin-manager'
                      ? 'bg-amber-400 text-slate-950 font-black shadow-md shadow-amber-400/20'
                      : 'text-amber-400 hover:text-amber-300 hover:bg-slate-900 border border-amber-500/30'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Admin Management</span>
                </button>
              )}

              <button
                onClick={() => setIsExpertAppModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-400 border border-cyan-500/30 transition-all whitespace-nowrap flex items-center gap-1.5"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Join Expert Network</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-12 animate-fadeIn">
            
            {/* HERO SECTION */}
            <div className="relative rounded-3xl bg-gradient-to-br from-slate-900 via-slate-950 to-cyan-950/40 border border-slate-800 p-6 sm:p-12 text-white shadow-2xl overflow-hidden">
              <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-1/4 w-96 h-64 bg-blue-500/10 blur-3xl pointer-events-none" />

              <div className="relative z-10 max-w-3xl space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-xs font-bold border border-cyan-500/30">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Managed Engineering & Digital Solutions</span>
                </div>

                <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-tight">
                  What can we help you build?
                </h1>

                <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
                  From technology and AI to design, cloud, writing and digital solutions, tell us what you need and Nexovira will help connect your project with the right expertise.
                </p>

                {/* Main Action Buttons */}
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    onClick={() => launchProjectWizard()}
                    className="px-6 py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-xl shadow-cyan-500/20 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <span>Describe Your Project</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setActiveTab('categories')}
                    className="px-6 py-3.5 bg-slate-900/80 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm rounded-xl border border-slate-700 transition-all cursor-pointer"
                  >
                    Explore Expertise
                  </button>

                  <button
                    onClick={() => setActiveTab('book-service')}
                    className="px-5 py-3.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 font-bold text-xs sm:text-sm rounded-xl border border-blue-500/40 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Briefcase className="w-4 h-4 text-blue-400" />
                    <span>Book a Service (On-Site &amp; Domestic)</span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-black">🇳🇬 Hub</span>
                  </button>
                </div>

                {/* Smart Conversational AI Search / Prompt Input */}
                <div className="pt-4">
                  <form onSubmit={handleAnalyzeHeroPrompt} className="relative">
                    <div className="relative flex items-center">
                      <Search className="w-5 h-5 text-cyan-400 absolute left-4 pointer-events-none" />
                      <input
                        type="text"
                        value={heroPrompt}
                        onChange={(e) => setHeroPrompt(e.target.value)}
                        placeholder="Tell us what you want to build, the problem you want to solve, or the service you need..."
                        className="w-full bg-slate-950/90 border border-slate-800 hover:border-cyan-500/60 focus:border-cyan-500 rounded-2xl pl-12 pr-28 sm:pr-32 py-4 text-xs sm:text-sm text-white placeholder-slate-500 shadow-inner focus:outline-none transition-all"
                      />
                      <button
                        type="submit"
                        disabled={isAnalyzingPrompt || !heroPrompt.trim()}
                        className="absolute right-2 px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-black text-xs rounded-xl transition-all flex items-center gap-1.5 shadow"
                      >
                        {isAnalyzingPrompt ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <>
                            <span>Analyze</span>
                            <Sparkles className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>
                    </div>
                  </form>

                  {/* Pre-made Example Chips */}
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] text-slate-500 font-bold mr-1">Popular inquiries:</span>
                    {PROMPT_EXAMPLE_CHIPS.map((chip, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setHeroPrompt(chip);
                          launchProjectWizard(undefined, undefined, chip);
                        }}
                        className="text-[11px] bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-cyan-400 border border-slate-800 px-2.5 py-1 rounded-lg transition-all"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>

                  {/* Live AI Analysis Preview if submitted via hero */}
                  {aiQuickAnalysis && (
                    <div className="mt-4 p-5 rounded-2xl bg-cyan-950/40 border border-cyan-500/40 space-y-3 animate-fadeIn">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs">
                          <Sparkles className="w-4 h-4" />
                          <span>AI Scoping Assessment</span>
                        </div>
                        <span className="text-[11px] text-slate-400">
                          Complexity: <strong className="text-white">{aiQuickAnalysis.projectComplexity || 'Medium'}</strong>
                        </span>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed">
                        {aiQuickAnalysis.summary}
                      </p>

                      {aiQuickAnalysis.recommendedExpertise && (
                        <div className="flex flex-wrap gap-1.5">
                          {aiQuickAnalysis.recommendedExpertise.map((sk: string, i: number) => (
                            <span key={i} className="text-[10px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded font-bold">
                              {sk}
                            </span>
                          ))}
                        </div>
                      )}

                      <button
                        onClick={() => launchProjectWizard(undefined, undefined, heroPrompt)}
                        className="w-full sm:w-auto px-5 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 shadow"
                      >
                        <span>Continue with this Scope in Project Wizard</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Trust Badges */}
                <div className="pt-6 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-300">
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>Vetted Specialized Talent Pool</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Centralized Quality Review</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Award className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Guaranteed Milestone Delivery</span>
                  </div>
                </div>
              </div>
            </div>

            {/* EXPLORE EXPERTISE PREVIEW SECTION */}
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs uppercase tracking-wider">
                    <Layers className="w-4 h-4" />
                    <span>Comprehensive Taxonomy</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-white mt-1">
                    Explore Expertise Tracks
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-400 mt-1">
                    Select a specialization track to explore sub-expertise, typical deliverables, and project scopes.
                  </p>
                </div>

                <button
                  onClick={() => setActiveTab('categories')}
                  className="text-xs text-cyan-400 hover:underline font-bold flex items-center gap-1 self-start sm:self-auto"
                >
                  <span>View All 10 Tracks</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Grid of Categories */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {categories.slice(0, 6).map((cat) => {
                  const IconComp = ICON_MAP[cat.iconName] || Code2;
                  return (
                    <div
                      key={cat.id}
                      onClick={() => handleOpenCategory(cat)}
                      className="group bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-cyan-500/50 rounded-2xl p-5 sm:p-6 transition-all duration-300 cursor-pointer flex flex-col justify-between space-y-4 shadow-lg"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center group-hover:scale-105 group-hover:bg-cyan-500/20 transition-all">
                            <IconComp className="w-6 h-6" />
                          </div>
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            {cat.subExpertise.length} Specializations
                          </span>
                        </div>

                        <div>
                          <h3 className="font-bold text-base text-white group-hover:text-cyan-400 transition-colors">
                            {cat.title}
                          </h3>
                          <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                            {cat.shortDescription}
                          </p>
                        </div>

                        {/* Skill Pills */}
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {cat.subExpertise.slice(0, 3).map((sub) => (
                            <span
                              key={sub.id}
                              className="text-[10px] bg-slate-950 text-slate-300 px-2 py-0.5 rounded-md border border-slate-800"
                            >
                              {sub.name}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-bold text-cyan-400 group-hover:translate-x-0.5 transition-transform">
                        <span>Explore {cat.title}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* HOW IT WORKS SECTION */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 sm:p-10 space-y-8">
              <div className="text-center max-w-2xl mx-auto space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-xs font-bold border border-cyan-500/20">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>The Nexovira Managed Model</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-white">
                  How Nexovira Powers Your Projects
                </h2>
                <p className="text-xs sm:text-sm text-slate-400">
                  Unlike open freelancer marketplaces, Nexovira acts as your centralized project partner from brief to milestone verification.
                </p>
              </div>

              {/* 4 Process Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 font-mono font-black text-sm flex items-center justify-center border border-cyan-500/20">
                    01
                  </div>
                  <h3 className="font-bold text-sm text-white">Tell Us What You Need</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Submit your idea or requirements in natural language. Describe your vision, deliverables, or problem.
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 font-mono font-black text-sm flex items-center justify-center border border-blue-500/20">
                    02
                  </div>
                  <h3 className="font-bold text-sm text-white">Nexovira Understands</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Nexovira AI structures your brief, identifies required technical capabilities, and organizes key milestones.
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 font-mono font-black text-sm flex items-center justify-center border border-indigo-500/20">
                    03
                  </div>
                  <h3 className="font-bold text-sm text-white">We Match Expertise</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Nexovira administration pairs your brief with a pre-vetted specialist possessing proven track records.
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 font-mono font-black text-sm flex items-center justify-center border border-emerald-500/20">
                    04
                  </div>
                  <h3 className="font-bold text-sm text-white">Project Execution</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Milestones are delivered with quality oversight. Client funds remain secured in managed escrow until approved.
                  </p>
                </div>
              </div>

              {/* Value Proposition Box */}
              <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="space-y-1 text-center sm:text-left">
                  <h4 className="font-black text-white text-sm sm:text-base">
                    No bidding wars. No unvetted freelancers. No coordination friction.
                  </h4>
                  <p className="text-xs text-slate-400">
                    Nexovira coordinates talent, manages milestone verification, and safeguards payments.
                  </p>
                </div>

                <button
                  onClick={() => launchProjectWizard()}
                  className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all shrink-0 flex items-center gap-2"
                >
                  <span>Start Your Project Brief</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* VETTED SPECIALISTS SHOWCASE */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs uppercase tracking-wider">
                    <UserCheck className="w-4 h-4" />
                    <span>Verified Talent Network</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-white mt-1">
                    Featured Network Specialists
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Pre-vetted technical leads and digital specialists active across the Nexovira Ecosystem.
                  </p>
                </div>
              </div>

              {loadingProviders ? (
                <div className="p-12 text-center text-slate-500 text-xs">Loading specialist directory...</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {vettedProviders.slice(0, 6).map((expert) => (
                    <div
                      key={expert.id}
                      className="bg-slate-900/80 border border-slate-800 hover:border-cyan-500/50 rounded-2xl p-5 space-y-4 transition-all shadow-lg flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start gap-3.5">
                          <img
                            src={expert.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80'}
                            alt={expert.name}
                            className="w-14 h-14 rounded-xl object-cover border border-cyan-500/30 shrink-0"
                          />
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-white text-sm">{expert.professionalName || expert.name}</h3>
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                            </div>
                            <p className="text-xs text-slate-400">{expert.title}</p>
                            <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider">
                              {expert.primaryExpertise || expert.specialization}
                            </span>
                          </div>
                        </div>

                        <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                          {expert.bio}
                        </p>

                        {expert.skills && (
                          <div className="flex flex-wrap gap-1">
                            {expert.skills.slice(0, 3).map((sk, i) => (
                              <span key={i} className="text-[10px] bg-slate-950 text-slate-300 px-2 py-0.5 rounded border border-slate-800">
                                {sk}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-1 text-amber-400 text-xs font-bold">
                          <Star className="w-3.5 h-3.5 fill-amber-400" />
                          <span>{expert.rating?.toFixed(1) || '5.0'}</span>
                          <span className="text-slate-500 text-[10px]">({expert.completedProjectsCount || 8}+ briefs)</span>
                        </div>

                        <button
                          onClick={() => setSelectedExpertForProfile(expert)}
                          className="text-xs text-cyan-400 hover:underline font-bold flex items-center gap-1"
                        >
                          <span>View Profile</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* JOIN THE EXPERT NETWORK BANNER */}
            <div className="rounded-3xl bg-gradient-to-r from-blue-950 via-slate-900 to-slate-950 border border-blue-900/40 p-8 sm:p-10 text-white relative overflow-hidden flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xl">
              <div className="space-y-2 max-w-xl text-center sm:text-left">
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-400 uppercase tracking-wider">
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Talent Partnership</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black">
                  Bring Your Expertise Into the Nexovira Ecosystem
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Join a growing network of professionals and receive opportunities aligned with your expertise. We match clients to you so you can focus on building.
                </p>
              </div>

              <button
                onClick={() => setIsExpertAppModalOpen(true)}
                className="px-6 py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-xl transition-all whitespace-nowrap flex items-center gap-2 shrink-0"
              >
                <span>Apply as an Expert</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: EXPLORE EXPERTISE (Full 10 Category Directory) */}
        {activeTab === 'categories' && (
          <div className="space-y-8 animate-fadeIn">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                All Expertise Tracks & Specializations
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Browse our complete technical catalog. Click any track to view specialized capabilities and initiate a targeted brief.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((cat) => {
                const IconComp = ICON_MAP[cat.iconName] || Code2;
                return (
                  <div
                    key={cat.id}
                    onClick={() => handleOpenCategory(cat)}
                    className="group bg-slate-900 border border-slate-800 hover:border-cyan-500/50 rounded-2xl p-6 transition-all cursor-pointer flex flex-col justify-between space-y-4 shadow-xl"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center group-hover:scale-105 group-hover:bg-cyan-500/20 transition-all">
                          <IconComp className="w-6 h-6" />
                        </div>
                        <span className="text-[11px] font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full">
                          {cat.subExpertise.length} Tracks
                        </span>
                      </div>

                      <div>
                        <h3 className="font-bold text-lg text-white group-hover:text-cyan-400 transition-colors">
                          {cat.title}
                        </h3>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                          {cat.shortDescription}
                        </p>
                      </div>

                      <div className="space-y-1 pt-1">
                        <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Specializations:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {cat.subExpertise.map((sub) => (
                            <span
                              key={sub.id}
                              className="text-[10px] bg-slate-950 text-slate-300 px-2 py-0.5 rounded-md border border-slate-800"
                            >
                              {sub.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs font-bold text-cyan-400">
                      <span>Explore Specializations</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: PROJECT REQUEST WIZARD */}
        {activeTab === 'request' && (
          <div className="animate-fadeIn">
            <ProjectRequestWizard
              initialCategory={wizardCategory}
              initialSubExpertise={wizardSubExpertise}
              initialPrompt={wizardInitialPrompt}
              currency={currentCurrency}
              onViewMyRequests={() => setActiveTab('my-requests')}
              onCancel={() => setActiveTab('overview')}
            />
          </div>
        )}

        {/* TAB 4: HOW IT WORKS DEEP-DIVE */}
        {activeTab === 'how-it-works' && (
          <div className="max-w-4xl mx-auto space-y-10 animate-fadeIn">
            <div className="text-center space-y-3">
              <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/20">
                Managed Professional Workflow
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-white">
                The Nexovira Managed Services Architecture
              </h2>
              <p className="text-sm text-slate-400 max-w-xl mx-auto leading-relaxed">
                Why businesses choose Nexovira over traditional freelance platforms.
              </p>
            </div>

            {/* Architecture Flow Diagram */}
            <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 space-y-6 text-center">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Centralized Coordination Lifecycle
              </span>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 text-xs font-bold">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-white w-full sm:w-44">
                  CUSTOMER
                  <span className="text-[10px] text-slate-500 block font-normal mt-0.5">Submits Requirements</span>
                </div>
                <ArrowRight className="w-4 h-4 text-cyan-400 rotate-90 sm:rotate-0 shrink-0" />
                <div className="p-4 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 w-full sm:w-44">
                  NEXOVIRA
                  <span className="text-[10px] text-slate-300 block font-normal mt-0.5">Scoping, Review & Match</span>
                </div>
                <ArrowRight className="w-4 h-4 text-cyan-400 rotate-90 sm:rotate-0 shrink-0" />
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-white w-full sm:w-44">
                  EXPERT SPECIALIST
                  <span className="text-[10px] text-slate-500 block font-normal mt-0.5">Executes Milestones</span>
                </div>
                <ArrowRight className="w-4 h-4 text-cyan-400 rotate-90 sm:rotate-0 shrink-0" />
                <div className="p-4 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 w-full sm:w-44">
                  COMPLETION
                  <span className="text-[10px] text-slate-300 block font-normal mt-0.5">Verified & Escrow Released</span>
                </div>
              </div>
            </div>

            {/* Comparison Matrix */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
              <h3 className="text-lg font-black text-white">Nexovira Managed Ecosystem vs Freelancer Marketplaces</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                      <th className="py-3 px-3">Feature</th>
                      <th className="py-3 px-3 text-cyan-400">Nexovira Tech & Digital Services</th>
                      <th className="py-3 px-3 text-slate-500">Traditional Platforms (Upwork/Fiverr)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    <tr>
                      <td className="py-3 px-3 font-bold text-white">Talent Sourcing</td>
                      <td className="py-3 px-3 text-cyan-400 font-bold">Curated, vetted, assigned directly by technical leads</td>
                      <td className="py-3 px-3 text-slate-400">Dozens of cold proposal bids and spam messages</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-3 font-bold text-white">Scoping & AI Guidance</td>
                      <td className="py-3 px-3 text-cyan-400 font-bold">Nexovira AI analyzes briefs and suggests deliverables</td>
                      <td className="py-3 px-3 text-slate-400">Client must write rigid specifications themselves</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-3 font-bold text-white">Quality Assurance</td>
                      <td className="py-3 px-3 text-cyan-400 font-bold">Milestones inspected by Nexovira administration</td>
                      <td className="py-3 px-3 text-slate-400">None; client must audit code and deliverables alone</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-3 font-bold text-white">Escrow & Milestone Safety</td>
                      <td className="py-3 px-3 text-cyan-400 font-bold">Full milestone escrow with verified release</td>
                      <td className="py-3 px-3 text-slate-400">Complex disputes and rigid platform fees</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="text-center pt-4">
              <button
                onClick={() => launchProjectWizard()}
                className="px-8 py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black text-sm rounded-xl shadow-xl shadow-cyan-500/20"
              >
                Describe Your Project Now
              </button>
            </div>
          </div>
        )}

        {/* TAB: BOOK A SERVICE (On-Site & Domestic Hub Nigeria) */}
        {activeTab === 'book-service' && (
          <div className="space-y-6 animate-fadeIn">
            <NigeriaServicesView
              onNavigateHome={onNavigateHome}
              onOpenAdminServices={onNavigateToAdminDashboard}
              isAdmin={userProfile?.role === 'admin' || userProfile?.role === 'super_admin'}
            />
          </div>
        )}

        {/* TAB 5: MY SERVICE REQUESTS (Customer Tracking) */}
        {activeTab === 'my-requests' && (
          <CustomerRequestsDashboard
            userEmail={user?.email || userProfile?.email}
            onNewRequest={() => launchProjectWizard()}
          />
        )}

        {/* TAB 6: SPECIALIST WORKSPACE (Expert Dashboard) */}
        {activeTab === 'expert-portal' && (
          <ExpertPortalView
            currentExpertName={userProfile?.displayName || user?.displayName || 'Nexovira Network Specialist'}
            onApplyNew={() => setIsExpertAppModalOpen(true)}
          />
        )}

        {/* TAB 7: ADMIN TECH & DIGITAL SERVICES MANAGER */}
        {activeTab === 'admin-manager' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-slate-900 border border-slate-800 rounded-3xl">
              <div>
                <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider block">
                  Nexovira Central Platform Control
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
                  Tech & Digital Services Administration
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Review client project briefs, trigger Gemini AI matching, vet talent applications, configure dynamic categories, and test email alerts to nexoviratech@gmail.com.
                </p>
              </div>

              {onNavigateToAdminDashboard && (
                <button
                  onClick={onNavigateToAdminDashboard}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-slate-700 transition-colors flex items-center gap-1.5 shrink-0"
                >
                  <ShieldCheck className="w-4 h-4 text-cyan-400" />
                  <span>Full Nexovira Admin Console</span>
                </button>
              )}
            </div>

            <AdminTechServicesManager />
          </div>
        )}

      </div>

      {/* MODAL 1: Category Details Modal */}
      <CategoryModal
        category={selectedCategory}
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onSelectExpertise={handleSelectSubExpertise}
      />

      {/* MODAL 2: Expert Application Modal */}
      <ExpertApplicationModal
        isOpen={isExpertAppModalOpen}
        onClose={() => setIsExpertAppModalOpen(false)}
        onApplicationSubmitted={() => loadProviders()}
      />

      {/* MODAL 3: Expert Public Safe Profile */}
      <ExpertProfileModal
        expert={selectedExpertForProfile}
        isOpen={!!selectedExpertForProfile}
        onClose={() => setSelectedExpertForProfile(null)}
        onRequestExpertise={(expert) => {
          setSelectedExpertForProfile(null);
          launchProjectWizard(undefined, undefined, `Project inquiry for specialist ${expert.professionalName || expert.name}`);
        }}
      />
    </div>
  );
};
