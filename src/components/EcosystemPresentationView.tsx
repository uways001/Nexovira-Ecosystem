import React, { useState, useEffect, useRef } from 'react';
import { NexoviraLogo } from './NexoviraLogo';
import { 
  Sparkles, 
  ArrowRight, 
  ArrowLeft, 
  Maximize2, 
  Minimize2, 
  Play, 
  Pause, 
  Grid, 
  CheckCircle2, 
  ShieldCheck, 
  Cpu, 
  BookOpen, 
  GraduationCap, 
  Code2, 
  Share2, 
  ShoppingBag, 
  Layers, 
  Zap, 
  Search, 
  Lock, 
  Users, 
  TrendingUp, 
  ChevronRight, 
  ExternalLink,
  RotateCcw,
  Compass,
  FileText,
  DollarSign,
  Smartphone,
  Eye,
  Key,
  Shield,
  Clock,
  Check,
  Award,
  Globe,
  Radio,
  Server,
  Workflow
} from 'lucide-react';

interface EcosystemPresentationViewProps {
  onNavigate: (path: string) => void;
  onOpenMarketplace?: () => void;
}

export const EcosystemPresentationView: React.FC<EcosystemPresentationViewProps> = ({
  onNavigate,
  onOpenMarketplace
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showGridOverview, setShowGridOverview] = useState(false);
  const [showPresenterNotes, setShowPresenterNotes] = useState(false);
  const [activeEcosystemNode, setActiveEcosystemNode] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const autoplayTimerRef = useRef<any>(null);

  const totalSlides = 12;

  // Slide Metadata & Speaker Notes
  const slidesData = [
    {
      id: 1,
      tag: "01 / VISION",
      title: "The Vision",
      subtitle: "Building a smarter ecosystem for modern living",
      speakerNotes: "Open with confidence. NEXOVIRA represents a unified paradigm shift from standard retail to an interconnected lifestyle and technology ecosystem."
    },
    {
      id: 2,
      tag: "02 / THE PROBLEM",
      title: "Digital life is becoming fragmented",
      subtitle: "Disconnected platforms create friction, inefficiency, and cognitive fatigue",
      speakerNotes: "Highlight how users are currently forced to jump across 7+ isolated platforms. NEXOVIRA closes these gaps into one cohesive hub."
    },
    {
      id: 3,
      tag: "03 / THE ARCHITECTURE",
      title: "One ecosystem. Many possibilities.",
      subtitle: "Eight interconnected ecosystem layers working in seamless harmony",
      speakerNotes: "Explain that NEXOVIRA is not a single product, but an organic multi-layered digital architecture where commerce, learning, and AI reinforce each other."
    },
    {
      id: 4,
      tag: "04 / COMMERCE REDESIGNED",
      title: "The Marketplace",
      subtitle: "High-grade consumer electronics, appliances, and smart living hardware",
      speakerNotes: "Highlight verified multi-vendor infrastructure, multi-currency support, seller escrow protection, and frictionless global checkout."
    },
    {
      id: 5,
      tag: "05 / INTELLIGENCE",
      title: "Smart Discovery",
      subtitle: "Search less. Discover more with context-aware semantic search",
      speakerNotes: "Demonstrate the shift from rigid keyword queries to intent-based lifestyle discovery that suggests hardware, accessories, and tutorials together."
    },
    {
      id: 6,
      tag: "06 / KNOWLEDGE ECONOMY",
      title: "Learning & Digital Products",
      subtitle: "Empowering creators, educators, and continuous lifelong learners",
      speakerNotes: "Emphasize live instant-delivery digital e-books alongside the upcoming NEXOVIRA Academy and specialized tech services roadmap."
    },
    {
      id: 7,
      tag: "07 / EMPOWERMENT",
      title: "The Creator & Affiliate Economy",
      subtitle: "Turn influence into opportunity with transparent automated rewards",
      speakerNotes: "Walk through the 5-step growth loop: Discover → Share → Refer → Purchase → Earn, supported by real-time analytics and fraud protection."
    },
    {
      id: 8,
      tag: "08 / NEXT-GEN HORIZON",
      title: "The AI Ecosystem",
      subtitle: "The upcoming intelligent orchestration layer of NEXOVIRA (Coming Soon)",
      speakerNotes: "Position AI as an ambient assistant that bridges user intent with relevant hardware, services, and educational resources."
    },
    {
      id: 9,
      tag: "09 / FOUNDATION",
      title: "Built for Trust",
      subtitle: "Institutional-grade cybersecurity, identity verification, and financial integrity",
      speakerNotes: "Detail the 8-layer trust matrix including NUBAN bank verification, OTP authentication, and automated affiliate fraud monitoring."
    },
    {
      id: 10,
      tag: "10 / COMMUNITY",
      title: "The People of NEXOVIRA",
      subtitle: "An inclusive, value-driven ecosystem designed for every participant",
      speakerNotes: "Show how customers, sellers, creators, educators, developers, and enterprises each capture compounding value from the network."
    },
    {
      id: 11,
      tag: "11 / STRATEGIC ROADMAP",
      title: "From Marketplace to Ecosystem",
      subtitle: "A disciplined, phase-by-phase evolution toward connected living",
      speakerNotes: "Present the pragmatic progression: starting with a profitable marketplace foundation, expanding into digital commerce, and culminating in full AI orchestration."
    },
    {
      id: 12,
      tag: "12 / THE FUTURE",
      title: "The Future is NEXOVIRA",
      subtitle: "Innovation begins with vision. Smart living, better every day.",
      speakerNotes: "Conclude on a visionary note. The ecosystem is just beginning, inviting partners, merchants, creators, and users to build the future together."
    }
  ];

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault();
        nextSlide();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        prevSlide();
      } else if (e.key === 'Home') {
        e.preventDefault();
        setCurrentSlide(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        setCurrentSlide(totalSlides - 1);
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      } else if (e.key === 'g' || e.key === 'G') {
        setShowGridOverview(prev => !prev);
      } else if (e.key === 'Escape') {
        setShowGridOverview(false);
        setShowPresenterNotes(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSlide]);

  // Autoplay handler
  useEffect(() => {
    if (isPlaying) {
      autoplayTimerRef.current = setInterval(() => {
        setCurrentSlide(prev => (prev + 1) % totalSlides);
      }, 7500);
    } else {
      if (autoplayTimerRef.current) clearInterval(autoplayTimerRef.current);
    }
    return () => {
      if (autoplayTimerRef.current) clearInterval(autoplayTimerRef.current);
    };
  }, [isPlaying]);

  const nextSlide = () => {
    setCurrentSlide(prev => (prev < totalSlides - 1 ? prev + 1 : 0));
  };

  const prevSlide = () => {
    setCurrentSlide(prev => (prev > 0 ? prev - 1 : totalSlides - 1));
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // 8 Ecosystem Nodes definition for Slide 3
  const ecosystemNodes = [
    {
      num: "01",
      title: "Marketplace",
      category: "Multi-Vendor Commerce",
      desc: "Curated consumer electronics, smart appliances & everyday lifestyle technology.",
      status: "LIVE",
      color: "from-cyan-500 to-blue-600",
      icon: ShoppingBag
    },
    {
      num: "02",
      title: "Appliances & Hardware",
      category: "Smart Living",
      desc: "Refrigerators, inverter ACs, micro-generators, solar setups & home automation.",
      status: "LIVE",
      color: "from-blue-500 to-indigo-600",
      icon: Zap
    },
    {
      num: "03",
      title: "Digital E-Books",
      category: "Knowledge Products",
      desc: "Instant download tech manuals, entrepreneurial blueprints & professional guides.",
      status: "LIVE",
      color: "from-emerald-500 to-teal-600",
      icon: BookOpen
    },
    {
      num: "04",
      title: "Academy",
      category: "Continuous Learning",
      desc: "Masterclasses, certifications, and technical upskilling for modern creators.",
      status: "COMING SOON",
      color: "from-amber-500 to-orange-600",
      icon: GraduationCap
    },
    {
      num: "05",
      title: "Tech Services",
      category: "Professional Solutions",
      desc: "Custom software engineering, cloud integration, IoT setups & maintenance.",
      status: "COMING SOON",
      color: "from-purple-500 to-violet-600",
      icon: Code2
    },
    {
      num: "06",
      title: "Affiliate & Creator Commerce",
      category: "Growth Engine",
      desc: "Transparent multi-tier commission tracking, affiliate wallet & instant payouts.",
      status: "LIVE",
      color: "from-rose-500 to-pink-600",
      icon: Share2
    },
    {
      num: "07",
      title: "AI Ecosystem",
      category: "Cognitive Layer",
      desc: "Intelligent concierge, contextual recommendations & conversational workflow.",
      status: "COMING SOON",
      color: "from-fuchsia-500 to-purple-600",
      icon: Sparkles
    },
    {
      num: "08",
      title: "Business & Tech Solutions",
      category: "Enterprise Infrastructure",
      desc: "B2B procurement, corporate seller onboarding, API tools & merchant growth.",
      status: "EXPANDING",
      color: "from-sky-500 to-cyan-600",
      icon: Workflow
    }
  ];

  return (
    <div 
      ref={containerRef}
      className="relative min-h-[92vh] bg-[#050C1A] text-slate-100 flex flex-col justify-between overflow-hidden select-none font-sans"
    >
      {/* Dynamic Ambient Background Glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[140px] animate-pulse" />
        <div className="absolute -bottom-40 -right-40 w-[700px] h-[700px] bg-purple-600/10 rounded-full blur-[160px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] bg-blue-600/5 rounded-full blur-[200px]" />
        
        {/* Subtle Cyber Grid Matrix */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(#00F0FF 1px, transparent 1px)`,
            backgroundSize: '36px 36px'
          }}
        />
      </div>

      {/* TOP DECK CONTROL BAR */}
      <header className="relative z-30 px-4 sm:px-8 py-3.5 border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-xl flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => onNavigate('/')}
            className="group flex items-center gap-2 cursor-pointer text-left"
            title="Return to NEXOVIRA Hub"
          >
            <NexoviraLogo size={28} showText={true} textClassName="text-sm font-black tracking-wider text-white" />
            <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              ECOSYSTEM DECK
            </span>
          </button>
        </div>

        {/* Center Slide Breadcrumbs / Jump Menu */}
        <div className="hidden md:flex items-center gap-1 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-full text-xs">
          <span className="font-mono text-cyan-400 font-bold">
            {String(currentSlide + 1).padStart(2, '0')}
          </span>
          <span className="text-slate-600">/</span>
          <span className="font-mono text-slate-400 font-medium">
            {String(totalSlides).padStart(2, '0')}
          </span>
          <span className="mx-2 text-slate-700">|</span>
          <span className="text-slate-300 font-semibold max-w-[200px] truncate">
            {slidesData[currentSlide].title}
          </span>
        </div>

        {/* Right Navigation & Mode Controls */}
        <div className="flex items-center gap-2">
          {/* Autoplay toggle */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`p-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              isPlaying
                ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-lg shadow-cyan-500/20'
                : 'bg-slate-900 text-slate-300 border-slate-800 hover:text-white hover:border-slate-700'
            }`}
            title={isPlaying ? "Pause Presentation" : "Start Autoplay Slideshow"}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span className="hidden lg:inline">{isPlaying ? 'Autoplay On' : 'Play'}</span>
          </button>

          {/* Grid Overview toggle */}
          <button
            onClick={() => setShowGridOverview(!showGridOverview)}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${
              showGridOverview
                ? 'bg-purple-600 text-white border-purple-500'
                : 'bg-slate-900 text-slate-300 border-slate-800 hover:text-white'
            }`}
            title="All Slides Grid (G)"
          >
            <Grid className="w-4 h-4" />
          </button>

          {/* Presenter Notes toggle */}
          <button
            onClick={() => setShowPresenterNotes(!showPresenterNotes)}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${
              showPresenterNotes
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-900 text-slate-300 border-slate-800 hover:text-white'
            }`}
            title="Speaker Takeaways"
          >
            <FileText className="w-4 h-4" />
          </button>

          {/* Fullscreen toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-slate-900 text-slate-300 border border-slate-800 hover:text-white hover:border-slate-700 transition-all cursor-pointer"
            title="Toggle Fullscreen (F)"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* MAIN PRESENTATION SLIDE STAGE */}
      <main className="relative z-20 flex-1 flex items-center justify-center p-4 sm:p-8 lg:p-12 max-w-7xl mx-auto w-full">
        
        {/* ========================================================================= */}
        {/* SLIDE 1 — THE VISION */}
        {/* ========================================================================= */}
        {currentSlide === 0 && (
          <div className="w-full flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-500 space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-black tracking-widest uppercase">
              <Sparkles className="w-3.5 h-3.5 text-cyan-300 animate-spin-slow" />
              <span>THE NEXOVIRA VISION</span>
            </div>

            {/* Giant Futuristic Brand Mark & Emblem */}
            <div className="relative group my-2">
              <div className="absolute -inset-6 bg-gradient-to-r from-cyan-500/30 via-purple-500/30 to-blue-500/30 rounded-3xl blur-2xl opacity-75 group-hover:opacity-100 transition-opacity duration-700" />
              <div className="relative p-6 sm:p-8 rounded-3xl bg-slate-950/80 border border-cyan-500/40 shadow-2xl backdrop-blur-2xl flex flex-col items-center">
                <NexoviraLogo size={88} showText={false} />
                <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white mt-4">
                  NEXO<span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-500">VIRA</span>
                </h1>
              </div>
            </div>

            <div className="max-w-3xl space-y-4">
              <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-100 leading-tight">
                “Building a smarter ecosystem for modern living.”
              </h2>
              
              <div className="p-4 sm:p-6 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-slate-900/60 to-purple-950/40 border border-slate-800 shadow-xl">
                <p className="text-sm sm:text-lg font-medium text-cyan-300 tracking-wide italic">
                  “Innovation begins with vision. Smart living, better every day.”
                </p>
              </div>

              <p className="text-xs sm:text-sm text-slate-400 font-normal leading-relaxed max-w-2xl mx-auto">
                A unified, next-generation digital ecosystem harmonizing premium hardware commerce, high-demand digital assets, creator monetization, and ambient intelligence.
              </p>

              {/* Founders Identification */}
              <div className="inline-flex flex-wrap items-center justify-center gap-3 px-4 py-2 rounded-2xl bg-slate-900/90 border border-slate-800 text-xs text-slate-300">
                <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider font-mono">Founders:</span>
                <span className="font-extrabold text-white">Abdullah Oderinde</span>
                <span className="text-slate-600">•</span>
                <span className="font-extrabold text-white">Musa Uways</span>
                <span className="text-slate-500 text-[11px]">(Lagos, Nigeria)</span>
              </div>
            </div>

            {/* Futuristic Live Capabilities Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-3xl pt-4">
              {[
                { label: "Commerce", icon: ShoppingBag, color: "text-cyan-400" },
                { label: "Electronics", icon: Zap, color: "text-blue-400" },
                { label: "E-Books", icon: BookOpen, color: "text-emerald-400" },
                { label: "Affiliates", icon: Share2, color: "text-rose-400" }
              ].map((item, i) => (
                <div key={i} className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-center gap-2">
                  <item.icon className={`w-4 h-4 ${item.color}`} />
                  <span className="text-xs font-bold text-slate-300">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SLIDE 2 — THE PROBLEM */}
        {/* ========================================================================= */}
        {currentSlide === 1 && (
          <div className="w-full space-y-8 animate-in fade-in slide-in-from-right-6 duration-500">
            <div className="text-center max-w-3xl mx-auto space-y-2">
              <span className="px-3 py-1 rounded-full text-xs font-black tracking-widest uppercase bg-red-500/10 text-red-400 border border-red-500/30">
                02 / INDUSTRY FRICTION
              </span>
              <h2 className="text-3xl sm:text-5xl font-black text-white">
                “Digital life is becoming fragmented.”
              </h2>
              <p className="text-sm sm:text-base text-slate-400">
                Modern consumers and entrepreneurs navigate disjointed platforms with broken context, multiple logins, and zero synergy.
              </p>
            </div>

            {/* Disconnected Silos Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
              {[
                { name: "Shopping", sub: "Isolated Stores", icon: ShoppingBag, color: "border-red-500/30 bg-red-500/5 text-red-400" },
                { name: "Tech Services", sub: "Disjointed Vendors", icon: Code2, color: "border-amber-500/30 bg-amber-500/5 text-amber-400" },
                { name: "Learning", sub: "Siloed Courses", icon: GraduationCap, color: "border-yellow-500/30 bg-yellow-500/5 text-yellow-400" },
                { name: "Digital Assets", sub: "Scattered Files", icon: BookOpen, color: "border-orange-500/30 bg-orange-500/5 text-orange-400" },
                { name: "Payments", sub: "Multiple Gateways", icon: DollarSign, color: "border-rose-500/30 bg-rose-500/5 text-rose-400" },
                { name: "Opportunities", sub: "Fragmented Affiliates", icon: Share2, color: "border-pink-500/30 bg-pink-500/5 text-pink-400" },
                { name: "AI Tools", sub: "Standalone Prompts", icon: Sparkles, color: "border-purple-500/30 bg-purple-500/5 text-purple-400" }
              ].map((item, i) => (
                <div key={i} className={`p-4 rounded-2xl border ${item.color} flex flex-col items-center text-center space-y-2 relative group hover:scale-[1.03] transition-transform`}>
                  <div className="w-10 h-10 rounded-xl bg-slate-950 flex items-center justify-center shadow">
                    <item.icon className="w-5 h-5" />
                  </div>
                  <div className="font-extrabold text-xs text-slate-200">{item.name}</div>
                  <div className="text-[10px] text-slate-400">{item.sub}</div>
                  <div className="text-[9px] font-mono text-red-400/80 pt-1">DISCONNECTED</div>
                </div>
              ))}
            </div>

            {/* Resolution Bridge */}
            <div className="p-6 rounded-3xl bg-gradient-to-r from-cyan-950/60 via-slate-900 to-indigo-950/60 border border-cyan-500/40 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
              <div className="space-y-1">
                <div className="text-xs font-black text-cyan-400 uppercase tracking-wider flex items-center gap-1.5 justify-center sm:justify-start">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                  <span>The NEXOVIRA Resolution</span>
                </div>
                <div className="text-lg sm:text-xl font-extrabold text-white">
                  “NEXOVIRA brings these experiences closer together.”
                </div>
                <div className="text-xs text-slate-400">
                  A cohesive digital umbrella connecting physical commerce, digital knowledge, creator incentives, and ambient tools under one verified account.
                </div>
              </div>

              <button 
                onClick={nextSlide}
                className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs shrink-0 flex items-center gap-2 shadow-lg shadow-cyan-500/20 cursor-pointer"
              >
                <span>Explore Ecosystem</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SLIDE 3 — THE NEXOVIRA ECOSYSTEM */}
        {/* ========================================================================= */}
        {currentSlide === 2 && (
          <div className="w-full space-y-6 animate-in fade-in zoom-in-95 duration-500">
            <div className="text-center max-w-3xl mx-auto space-y-1">
              <span className="px-3 py-1 rounded-full text-xs font-black tracking-widest uppercase bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                03 / SYSTEM ARCHITECTURE
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-white">
                “One ecosystem. Many possibilities.”
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                Eight interconnected ecosystem layers forming a self-reinforcing digital flywheel.
              </p>
            </div>

            {/* 8 Interconnected Node Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {ecosystemNodes.map((node, idx) => {
                const IconComponent = node.icon;
                const isSelected = activeEcosystemNode === idx;
                return (
                  <div
                    key={idx}
                    onClick={() => setActiveEcosystemNode(isSelected ? null : idx)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer relative group text-left ${
                      isSelected
                        ? 'border-cyan-400 bg-slate-900 shadow-xl ring-2 ring-cyan-500/30'
                        : 'border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className={`w-8 h-8 rounded-lg bg-gradient-to-tr ${node.color} text-white flex items-center justify-center shadow`}>
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-black text-slate-400">{node.num}</span>
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                          node.status === 'LIVE'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : node.status === 'COMING SOON'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                            : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                        }`}>
                          {node.status}
                        </span>
                      </div>
                    </div>

                    <h3 className="font-extrabold text-sm text-white group-hover:text-cyan-300 transition-colors">
                      {node.title}
                    </h3>
                    <p className="text-[11px] font-semibold text-cyan-400 mb-1">
                      {node.category}
                    </p>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {node.desc}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Central Orbital Nexus Banner */}
            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs text-slate-400 px-6">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                <span className="font-bold text-slate-200">Unified Data & Identity Layer:</span>
                <span className="hidden sm:inline">Single sign-on, unified wallet, shared security, cross-domain referral persistence.</span>
              </div>
              <span className="font-mono text-[11px] text-cyan-400">NEXOVIRA CORE v2.4</span>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SLIDE 4 — THE MARKETPLACE */}
        {/* ========================================================================= */}
        {currentSlide === 3 && (
          <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center animate-in fade-in slide-in-from-right-6 duration-500 text-left">
            {/* Left Context Column */}
            <div className="lg:col-span-5 space-y-5">
              <span className="px-3 py-1 rounded-full text-xs font-black tracking-widest uppercase bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                04 / PHYSICAL COMMERCE
              </span>
              <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
                “Commerce, redesigned.”
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                A premium, multi-vendor marketplace tailored for essential electronics, home appliances, and smart living setups with zero counterfeit tolerance.
              </p>

              <div className="space-y-2.5">
                {[
                  { title: "Multi-Vendor Marketplace", desc: "Verified corporate and licensed independent appliance merchants." },
                  { title: "Multi-Currency Dynamic Pricing", desc: "Native support for NGN, USD, EUR, GBP, CAD, KES, ZAR with live FX conversion." },
                  { title: "Secure Payouts & Escrow", desc: "Automated seller settlement after delivery confirmation." },
                  { title: "Zero-Friction Discovery", desc: "Category filters, comparison matrices, and fast express checkout." }
                ].map((feat, i) => (
                  <div key={i} className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-900/50 border border-slate-800">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-bold text-white">{feat.title}</div>
                      <div className="text-[11px] text-slate-400">{feat.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Interactive Marketplace UI Mockup Card */}
            <div className="lg:col-span-7 space-y-3">
              <div className="p-5 sm:p-6 rounded-3xl bg-slate-950 border border-slate-800 shadow-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span className="text-[11px] font-mono text-slate-400 ml-2">store.nexovira.com</span>
                  </div>
                  <span className="text-[10px] bg-cyan-500/10 text-cyan-400 font-bold px-2 py-0.5 rounded-md border border-cyan-500/30">
                    LIVE CATALOG
                  </span>
                </div>

                {/* Mock Product Cards Showcase */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Card 1 */}
                  <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                    <div className="relative aspect-16/10 rounded-xl bg-slate-950 overflow-hidden">
                      <img 
                        src="https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=600&auto=format&fit=crop&q=80" 
                        alt="Refrigerator"
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute top-2 left-2 text-[9px] font-black bg-cyan-500 text-slate-950 px-2 py-0.5 rounded">
                        TOP RATED
                      </span>
                    </div>
                    <div className="font-extrabold text-xs text-white truncate">NEXOVIRA Dual-Inverter 450L Smart Refrigerator</div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-black text-cyan-400">₦850,000</span>
                      <span className="text-[10px] text-slate-400">Stock: 18 units</span>
                    </div>
                  </div>

                  {/* Card 2 */}
                  <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                    <div className="relative aspect-16/10 rounded-xl bg-slate-950 overflow-hidden">
                      <img 
                        src="https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=600&auto=format&fit=crop&q=80" 
                        alt="AC"
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute top-2 left-2 text-[9px] font-black bg-rose-500 text-white px-2 py-0.5 rounded">
                        FLASH DEAL
                      </span>
                    </div>
                    <div className="font-extrabold text-xs text-white truncate">NEXOVIRA ArcticGen 2.0HP Eco Inverter AC</div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-black text-cyan-400">₦620,000</span>
                      <span className="text-[10px] text-slate-400">Stock: 24 units</span>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-between text-xs text-cyan-300 font-semibold">
                  <span>Direct Integration with Seller Verification & Banking API</span>
                  <ShieldCheck className="w-4 h-4 text-cyan-400" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SLIDE 5 — SMART DISCOVERY */}
        {/* ========================================================================= */}
        {currentSlide === 4 && (
          <div className="w-full space-y-6 animate-in fade-in zoom-in-95 duration-500 text-left">
            <div className="text-center max-w-3xl mx-auto space-y-2">
              <span className="px-3 py-1 rounded-full text-xs font-black tracking-widest uppercase bg-purple-500/10 text-purple-400 border border-purple-500/30">
                05 / CONTEXTUAL DISCOVERY
              </span>
              <h2 className="text-3xl sm:text-5xl font-black text-white">
                “Search less. Discover more.”
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                Transitioning beyond rigid keywords to semantic, intent-driven assistance across all ecosystem layers.
              </p>
            </div>

            {/* Visual AI Search Mockup Stage */}
            <div className="max-w-4xl mx-auto p-6 rounded-3xl bg-slate-950 border border-purple-500/30 shadow-2xl space-y-5">
              {/* Query Bar */}
              <div className="p-3 sm:p-4 rounded-2xl bg-slate-900 border border-purple-500/40 flex items-center gap-3 shadow-inner">
                <Search className="w-5 h-5 text-purple-400 shrink-0" />
                <span className="font-mono text-xs sm:text-sm text-purple-200 font-semibold flex-1">
                  “What do I need for a reliable, energy-efficient smart home?”
                </span>
                <span className="px-3 py-1 rounded-lg bg-purple-600 text-white font-black text-xs uppercase shrink-0">
                  AI INTENT
                </span>
              </div>

              {/* Synthesized Multi-Layer Recommendations */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  <span>Synthesized Ecosystem Recommendations:</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Category 1 */}
                  <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                    <div className="text-[10px] font-black uppercase text-cyan-400">Hardware Tier</div>
                    <div className="font-bold text-xs text-white">Inverter AC & Smart Fridge</div>
                    <div className="text-[11px] text-slate-400">Saves 45% electricity with smart temperature sensors.</div>
                  </div>

                  {/* Category 2 */}
                  <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                    <div className="text-[10px] font-black uppercase text-blue-400">Energy & Power</div>
                    <div className="font-bold text-xs text-white">Pure Sine Wave Inverter</div>
                    <div className="text-[11px] text-slate-400">Automatic switchover with surge protection.</div>
                  </div>

                  {/* Category 3 */}
                  <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                    <div className="text-[10px] font-black uppercase text-emerald-400">Digital Blueprint</div>
                    <div className="font-bold text-xs text-white">Smart Home Energy Guide</div>
                    <div className="text-[11px] text-slate-400">Instant PDF download with load calculations.</div>
                  </div>

                  {/* Category 4 */}
                  <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                    <div className="text-[10px] font-black uppercase text-amber-400">Tech Services (Roadmap)</div>
                    <div className="font-bold text-xs text-white">Certified IoT Installation</div>
                    <div className="text-[11px] text-slate-400">Professional technician deployment.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SLIDE 6 — LEARNING & DIGITAL ECONOMY */}
        {/* ========================================================================= */}
        {currentSlide === 5 && (
          <div className="w-full space-y-6 animate-in fade-in slide-in-from-right-6 duration-500 text-left">
            <div className="text-center max-w-3xl mx-auto space-y-2">
              <span className="px-3 py-1 rounded-full text-xs font-black tracking-widest uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                06 / KNOWLEDGE PLATFORM
              </span>
              <h2 className="text-3xl sm:text-5xl font-black text-white">
                “Knowledge should be accessible, useful and valuable.”
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                A hybrid marketplace for downloadable digital assets, technical masterclasses, and specialized engineering services.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Card 1: Digital E-Books (LIVE) */}
              <div className="p-6 rounded-3xl bg-slate-950 border border-emerald-500/40 shadow-xl space-y-3 relative">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    LIVE & OPERATIONAL
                  </span>
                </div>
                <h3 className="text-lg font-black text-white">Digital E-Books & Assets</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Instant PDF delivery with secure tokens, author royalties, watermarking, and preview galleries.
                </p>
                <div className="pt-2 text-xs text-emerald-400 font-bold flex items-center gap-1">
                  <Check className="w-4 h-4" /> Direct download upon checkout
                </div>
              </div>

              {/* Card 2: Academy (COMING SOON) */}
              <div className="p-6 rounded-3xl bg-slate-950/80 border border-amber-500/30 shadow-xl space-y-3 relative">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    FUTURE LAYER • COMING SOON
                  </span>
                </div>
                <h3 className="text-lg font-black text-white">NEXOVIRA Academy</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Video-based courses, masterclasses, and certified accreditations taught by industry veterans.
                </p>
                <div className="pt-2 text-xs text-amber-400/90 font-mono">
                  Curriculum Architecture in Development
                </div>
              </div>

              {/* Card 3: Tech Services (COMING SOON) */}
              <div className="p-6 rounded-3xl bg-slate-950/80 border border-blue-500/30 shadow-xl space-y-3 relative">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center">
                    <Code2 className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40">
                    FUTURE LAYER • COMING SOON
                  </span>
                </div>
                <h3 className="text-lg font-black text-white">Technical Services Hub</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  On-demand engineers, solar installations, IoT device servicing, and custom software development.
                </p>
                <div className="pt-2 text-xs text-blue-400/90 font-mono">
                  Verified Contractor Network Onboarding
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SLIDE 7 — THE CREATOR & AFFILIATE ECONOMY */}
        {/* ========================================================================= */}
        {currentSlide === 6 && (
          <div className="w-full space-y-6 animate-in fade-in zoom-in-95 duration-500 text-left">
            <div className="text-center max-w-3xl mx-auto space-y-2">
              <span className="px-3 py-1 rounded-full text-xs font-black tracking-widest uppercase bg-rose-500/10 text-rose-400 border border-rose-500/30">
                07 / REVENUE ENGINE
              </span>
              <h2 className="text-3xl sm:text-5xl font-black text-white">
                “Turn influence into opportunity.”
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                A transparent, high-converting affiliate infrastructure rewarding creators, reviewers, and brand advocates.
              </p>
            </div>

            {/* 5-Step Value Flow Loop */}
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              {[
                { step: "01", title: "Discover", desc: "Browse high-converting appliances & digital products.", icon: Search },
                { step: "02", title: "Share", desc: "Generate secure unique tracking links with 1 click.", icon: Share2 },
                { step: "03", title: "Refer", desc: "Audience clicks and enters 30-day cookie window.", icon: Users },
                { step: "04", title: "Purchase", desc: "Customer completes verified order on NEXOVIRA.", icon: ShoppingBag },
                { step: "05", title: "Earn", desc: "Instant commission credited to automated wallet.", icon: DollarSign }
              ].map((flow, i) => (
                <div key={i} className="p-4 rounded-2xl bg-slate-950 border border-rose-500/30 flex flex-col justify-between space-y-2 relative group hover:border-rose-400 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-black text-rose-400">{flow.step}</span>
                    <flow.icon className="w-4 h-4 text-rose-400" />
                  </div>
                  <div>
                    <div className="font-extrabold text-sm text-white">{flow.title}</div>
                    <div className="text-[11px] text-slate-400 leading-snug">{flow.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Feature Highlights Grid */}
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="space-y-1">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-rose-400" />
                  <span>Fraud-Resistant Engine</span>
                </div>
                <div className="text-slate-400 text-[11px]">Self-referral prevention and transaction escrow locks ensure audit compliance.</div>
              </div>

              <div className="space-y-1">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-rose-400" />
                  <span>Transparent Tiered Rates</span>
                </div>
                <div className="text-slate-400 text-[11px]">From 5% up to 25% on selected high-margin digital items and appliances.</div>
              </div>

              <div className="space-y-1">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <Radio className="w-4 h-4 text-rose-400" />
                  <span>Direct Bank Payouts</span>
                </div>
                <div className="text-slate-400 text-[11px]">Seamless NUBAN bank verification and automated threshold withdrawals.</div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SLIDE 8 — THE AI ECOSYSTEM */}
        {/* ========================================================================= */}
        {currentSlide === 7 && (
          <div className="w-full space-y-6 animate-in fade-in slide-in-from-right-6 duration-500 text-left">
            <div className="text-center max-w-3xl mx-auto space-y-2">
              <span className="px-3 py-1 rounded-full text-xs font-black tracking-widest uppercase bg-purple-500/10 text-purple-400 border border-purple-500/30">
                08 / FUTURE VISION • COMING SOON
              </span>
              <h2 className="text-3xl sm:text-5xl font-black text-white">
                “The next layer of NEXOVIRA.”
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                NEXOVIRA AI is being architected as an ambient intelligence layer, not a standalone chatbot.
              </p>
            </div>

            {/* AI Architecture Flow */}
            <div className="max-w-4xl mx-auto p-6 sm:p-8 rounded-3xl bg-slate-950 border border-purple-500/40 shadow-2xl space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-400 animate-spin-slow" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">Cognitive Interaction Pipeline</span>
                </div>
                <span className="text-[10px] font-mono text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded border border-purple-500/40">
                  DEVELOPMENT ROADMAP
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 relative">
                {[
                  { num: "01", step: "Natural Prompt", desc: "User expresses a lifestyle or technical need in plain words." },
                  { num: "02", step: "Intent Extraction", desc: "Model identifies hardware, services, and prerequisite knowledge." },
                  { num: "03", step: "Ecosystem Search", desc: "Vector search queries real inventory, verified sellers & guides." },
                  { num: "04", step: "Curated Action", desc: "Presents exact bundle with one-click checkout and setup manual." }
                ].map((item, i) => (
                  <div key={i} className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
                    <span className="text-xs font-black font-mono text-purple-400">{item.num}</span>
                    <div className="font-extrabold text-xs text-white">{item.step}</div>
                    <div className="text-[11px] text-slate-400 leading-snug">{item.desc}</div>
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-2xl bg-purple-950/20 border border-purple-500/30 text-xs text-purple-200 flex items-center gap-3">
                <Cpu className="w-5 h-5 text-purple-400 shrink-0" />
                <span>
                  <strong>Ethical AI Disclosure:</strong> All AI features described on this slide represent our upcoming technology roadmap and will be released in phased beta versions.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SLIDE 9 — TRUST & SECURITY */}
        {/* ========================================================================= */}
        {currentSlide === 8 && (
          <div className="w-full space-y-6 animate-in fade-in zoom-in-95 duration-500 text-left">
            <div className="text-center max-w-3xl mx-auto space-y-2">
              <span className="px-3 py-1 rounded-full text-xs font-black tracking-widest uppercase bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                09 / INSTITUTIONAL SECURITY
              </span>
              <h2 className="text-3xl sm:text-5xl font-black text-white">
                “Built for trust.”
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                Trust is our core currency. A multi-layered defense architecture protecting identities, transactions, and intellectual property.
              </p>
            </div>

            {/* Cybersecurity 6-Pillar Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { title: "Secure Authentication & OTP", desc: "Dual-layer email & SMS verification with role-based token gating.", icon: Key },
                { title: "Bank-Account NUBAN Verification", desc: "Backend interbank lookup ensuring seller account holder names match official profiles.", icon: ShieldCheck },
                { title: "Seller Escrow Protection", desc: "Funds held securely until verified receipt of products.", icon: Lock },
                { title: "Affiliate Anti-Fraud Engine", desc: "IP fingerprinting, self-referral blocks, and transaction integrity checks.", icon: Shield },
                { title: "Auditable Financial Records", desc: "Immutable transaction logs and exportable accounting ledgers.", icon: FileText },
                { title: "Privacy-First Data Architecture", desc: "Strict end-to-end data encryption and zero third-party telemetry harvesting.", icon: Server }
              ].map((sec, i) => (
                <div key={i} className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 flex items-start gap-3 hover:border-cyan-500/40 transition-colors">
                  <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
                    <sec.icon className="w-4 h-4" />
                  </div>
                  <div className="space-y-1">
                    <div className="font-extrabold text-xs text-white">{sec.title}</div>
                    <div className="text-[11px] text-slate-400 leading-relaxed">{sec.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SLIDE 10 — THE PEOPLE OF NEXOVIRA */}
        {/* ========================================================================= */}
        {currentSlide === 9 && (
          <div className="w-full space-y-6 animate-in fade-in slide-in-from-right-6 duration-500 text-left">
            <div className="text-center max-w-3xl mx-auto space-y-2">
              <span className="px-3 py-1 rounded-full text-xs font-black tracking-widest uppercase bg-blue-500/10 text-blue-400 border border-blue-500/30">
                10 / STAKEHOLDER MATRIX
              </span>
              <h2 className="text-3xl sm:text-5xl font-black text-white">
                “An ecosystem built for everyone.”
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                Designing compounding network effects where each participant creates value for the entire community.
              </p>
            </div>

            {/* 6 Participant Archetypes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { role: "Customers", tagline: "Discover and buy with total confidence.", desc: "Authentic appliances, fast delivery, and instant digital asset downloads.", icon: ShoppingBag, color: "text-cyan-400 border-cyan-500/30" },
                { role: "Sellers & Merchants", tagline: "Build and scale your digital store.", desc: "Direct customer access, verified payouts, and AI inventory optimization.", icon: Zap, color: "text-blue-400 border-blue-500/30" },
                { role: "Creators & Authors", tagline: "Publish and monetize your knowledge.", desc: "Digital e-books, blueprints, and transparent automated royalty earnings.", icon: BookOpen, color: "text-emerald-400 border-emerald-500/30" },
                { role: "Affiliates & Partners", tagline: "Share products and earn commissions.", desc: "Automated link tracking, real-time analytics, and reliable bank transfers.", icon: Share2, color: "text-rose-400 border-rose-500/30" },
                { role: "Educators (Upcoming)", tagline: "Teach masterclasses and mentor.", desc: "Interactive course platform with automated certification delivery.", icon: GraduationCap, color: "text-amber-400 border-amber-500/30" },
                { role: "Enterprises & Tech Pros", tagline: "Connect with modern living clients.", desc: "B2B procurement, installation contracts, and software engineering services.", icon: Workflow, color: "text-purple-400 border-purple-500/30" }
              ].map((user, i) => (
                <div key={i} className={`p-5 rounded-2xl bg-slate-950 border ${user.color} space-y-2 hover:scale-[1.02] transition-transform`}>
                  <div className="flex items-center gap-2">
                    <user.icon className="w-5 h-5" />
                    <span className="font-extrabold text-sm text-white">{user.role}</span>
                  </div>
                  <div className="font-bold text-xs text-slate-300">{user.tagline}</div>
                  <div className="text-[11px] text-slate-400 leading-relaxed">{user.desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SLIDE 11 — THE LONG-TERM VISION */}
        {/* ========================================================================= */}
        {currentSlide === 10 && (
          <div className="w-full space-y-6 animate-in fade-in zoom-in-95 duration-500 text-left">
            <div className="text-center max-w-3xl mx-auto space-y-2">
              <span className="px-3 py-1 rounded-full text-xs font-black tracking-widest uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                11 / EVOLUTION ROADMAP
              </span>
              <h2 className="text-3xl sm:text-5xl font-black text-white">
                “From marketplace to ecosystem.”
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                A disciplined, five-phase product evolution focused on sustainable fundamentals.
              </p>
            </div>

            {/* Strategic Roadmap Timeline */}
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 relative">
              {[
                { phase: "PHASE 1", status: "TODAY", title: "Marketplace Foundation", desc: "Core appliance commerce, multi-vendor dashboards & NUBAN bank verification.", badge: "LIVE" },
                { phase: "PHASE 2", status: "NEXT", title: "Digital & Affiliates", desc: "PDF e-book engine, multi-image upload studio & affiliate payout automation.", badge: "OPERATIONAL" },
                { phase: "PHASE 3", status: "FUTURE", title: "Academy & Services", desc: "Masterclass courses, video streaming & certified technician network.", badge: "IN DEV" },
                { phase: "PHASE 4", status: "NEXT GEN", title: "AI Ecosystem", desc: "Contextual discovery concierge, automated store insights & smart bundles.", badge: "ROADMAP" },
                { phase: "PHASE 5", status: "LONG TERM", title: "Unified Living Hub", desc: "Complete IoT connectivity, global B2B commerce & cross-border merchant network.", badge: "VISION" }
              ].map((stage, i) => (
                <div key={i} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 flex flex-col justify-between relative group hover:border-cyan-500/40 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-black text-slate-400">{stage.phase}</span>
                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                      {stage.status}
                    </span>
                  </div>
                  <div>
                    <div className="font-extrabold text-xs text-white">{stage.title}</div>
                    <div className="text-[11px] text-slate-400 leading-snug mt-1">{stage.desc}</div>
                  </div>
                  <div className="pt-2 text-[9px] font-mono font-bold text-slate-500 uppercase">
                    {stage.badge}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-center text-xs text-slate-400">
              Pragmatic, product-first execution: Scaling with real customer demand and robust unit economics.
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SLIDE 12 — THE FUTURE */}
        {/* ========================================================================= */}
        {currentSlide === 11 && (
          <div className="w-full flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-500 space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-black tracking-widest uppercase">
              <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
              <span>THE ECOSYSTEM IS JUST BEGINNING</span>
            </div>

            {/* Grand Finale Branding */}
            <div className="relative group">
              <div className="absolute -inset-8 bg-gradient-to-r from-cyan-500/30 via-purple-600/30 to-blue-500/30 rounded-full blur-3xl opacity-80" />
              <div className="relative flex flex-col items-center">
                <NexoviraLogo size={96} showText={false} />
                <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-white tracking-tight mt-4">
                  NEXOVIRA
                </h1>
              </div>
            </div>

            <div className="max-w-2xl space-y-4">
              <p className="text-lg sm:text-2xl font-bold text-cyan-300 italic">
                “Innovation begins with vision. Smart living, better every day.”
              </p>

              <p className="text-sm sm:text-base text-slate-300 font-medium leading-relaxed">
                “We are building more than a marketplace. We are building an ecosystem designed for the way people will live, learn, create and do business tomorrow.”
              </p>

              <div className="text-xs font-mono text-slate-400 tracking-wider pt-2">
                NEXOVIRA — The ecosystem is just beginning.
              </div>
            </div>

            {/* Interactive Jump Actions */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
              <button
                onClick={() => onNavigate('/marketplace')}
                className="px-6 py-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs shadow-lg shadow-cyan-500/20 flex items-center gap-2 cursor-pointer transition-all hover:scale-105 active:scale-95"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Explore Live Marketplace</span>
              </button>

              <button
                onClick={() => onNavigate('/library')}
                className="px-6 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white border border-slate-700 font-bold text-xs flex items-center gap-2 cursor-pointer transition-all"
              >
                <BookOpen className="w-4 h-4 text-emerald-400" />
                <span>Browse Digital Library</span>
              </button>

              <button
                onClick={() => onNavigate('/affiliate')}
                className="px-6 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white border border-slate-700 font-bold text-xs flex items-center gap-2 cursor-pointer transition-all"
              >
                <Share2 className="w-4 h-4 text-rose-400" />
                <span>Join Affiliate Program</span>
              </button>
            </div>
          </div>
        )}

      </main>

      {/* BOTTOM SLIDE PROGRESS & NAVIGATION STRIP */}
      <footer className="relative z-30 px-4 sm:px-8 py-3.5 border-t border-slate-800/80 bg-slate-950/80 backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Slide Counter & Category Tag */}
        <div className="flex items-center gap-3 text-xs">
          <span className="font-mono text-cyan-400 font-extrabold">
            SLIDE {String(currentSlide + 1).padStart(2, '0')} OF {String(totalSlides).padStart(2, '0')}
          </span>
          <span className="text-slate-600 hidden sm:inline">•</span>
          <span className="text-slate-400 font-medium hidden sm:inline">
            {slidesData[currentSlide].tag}
          </span>
        </div>

        {/* Dynamic Progress Bar Indicators */}
        <div className="flex items-center gap-1.5 max-w-md w-full sm:w-auto">
          {Array.from({ length: totalSlides }).map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentSlide(i)}
              className={`h-1.5 rounded-full transition-all cursor-pointer ${
                currentSlide === i
                  ? 'w-7 bg-cyan-400 shadow-sm shadow-cyan-400/50'
                  : i < currentSlide
                  ? 'w-2 sm:w-3 bg-cyan-600/60'
                  : 'w-2 sm:w-3 bg-slate-800 hover:bg-slate-700'
              }`}
              title={`Slide ${i + 1}: ${slidesData[i].title}`}
            />
          ))}
        </div>

        {/* Previous / Next Arrow Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={prevSlide}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-all flex items-center gap-1 text-xs font-bold cursor-pointer"
            title="Previous Slide (Left Arrow)"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Prev</span>
          </button>

          <button
            onClick={nextSlide}
            className="p-2 px-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black transition-all flex items-center gap-1 text-xs shadow-md shadow-cyan-500/20 cursor-pointer"
            title="Next Slide (Right Arrow or Space)"
          >
            <span>{currentSlide === totalSlides - 1 ? 'First Slide' : 'Next'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </footer>

      {/* ========================================================================= */}
      {/* GRID OVERVIEW MODAL DRAWER (Press 'G') */}
      {/* ========================================================================= */}
      {showGridOverview && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-2xl p-6 sm:p-10 flex flex-col justify-between overflow-y-auto animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4 max-w-7xl mx-auto w-full">
            <div>
              <h3 className="text-xl font-black text-white flex items-center gap-2">
                <Grid className="w-5 h-5 text-purple-400" />
                <span>NEXOVIRA Ecosystem Slide Index</span>
              </h3>
              <p className="text-xs text-slate-400">Click any slide card to jump directly into presentation mode.</p>
            </div>
            <button
              onClick={() => setShowGridOverview(false)}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 rounded-xl text-xs font-bold border border-slate-800 cursor-pointer"
            >
              Close Grid (ESC)
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 max-w-7xl mx-auto w-full my-6">
            {slidesData.map((slide, idx) => (
              <div
                key={slide.id}
                onClick={() => {
                  setCurrentSlide(idx);
                  setShowGridOverview(false);
                }}
                className={`p-4 rounded-2xl border text-left cursor-pointer transition-all ${
                  currentSlide === idx
                    ? 'border-cyan-400 bg-slate-900 shadow-2xl ring-2 ring-cyan-400/40 scale-[1.02]'
                    : 'border-slate-800 bg-slate-950/80 hover:border-slate-700 hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-[10px] font-black text-cyan-400">SLIDE {String(idx + 1).padStart(2, '0')}</span>
                  {currentSlide === idx && (
                    <span className="text-[9px] bg-cyan-500 text-slate-950 font-black px-1.5 py-0.2 rounded">CURRENT</span>
                  )}
                </div>
                <div className="font-extrabold text-xs text-white truncate">{slide.title}</div>
                <div className="text-[10px] text-slate-400 line-clamp-2 mt-1">{slide.subtitle}</div>
              </div>
            ))}
          </div>

          <div className="text-center text-xs text-slate-500 max-w-7xl mx-auto w-full border-t border-slate-800/80 pt-4">
            Navigation shortcuts: [←] Previous, [→ / Space] Next, [F] Fullscreen, [G] Grid Toggle, [ESC] Close
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SPEAKER NOTES DRAWER */}
      {/* ========================================================================= */}
      {showPresenterNotes && (
        <div className="fixed bottom-14 right-4 z-40 max-w-md w-full p-4 rounded-2xl bg-slate-900/95 border border-amber-500/40 shadow-2xl backdrop-blur-xl text-left animate-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
            <span className="text-xs font-black uppercase text-amber-400 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              <span>Speaker Key Takeaways</span>
            </span>
            <button 
              onClick={() => setShowPresenterNotes(false)}
              className="text-slate-400 hover:text-white text-xs"
            >
              ✕
            </button>
          </div>
          <div className="text-xs text-slate-200 leading-relaxed">
            {slidesData[currentSlide].speakerNotes}
          </div>
        </div>
      )}
    </div>
  );
};
