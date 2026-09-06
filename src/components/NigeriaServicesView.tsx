import React, { useState, useEffect, useMemo } from 'react';
import { 
  Briefcase, 
  MapPin, 
  Sparkles, 
  Search, 
  Filter, 
  ShieldCheck, 
  Star, 
  Clock, 
  DollarSign, 
  Send, 
  UserCheck, 
  Layers, 
  ArrowRight, 
  ChevronRight, 
  CheckCircle2, 
  Linkedin, 
  ExternalLink,
  Globe2,
  RefreshCw,
  PlusCircle,
  Activity,
  FileText,
  Trash2
} from 'lucide-react';
import { TechService, ServiceProvider, ServiceRequest } from '../types';
import { getTechServicesFromFirestore, getServiceProvidersFromFirestore, deleteTechServiceFromFirestore } from '../lib/firestoreService';
import { NIGERIA_SERVICE_CATEGORIES } from '../data/nigeriaServicesData';
import { ServiceRequestModal } from './ServiceRequestModal';
import { ProviderProfileModal } from './ProviderProfileModal';
import { ServiceRequestTrackerModal } from './ServiceRequestTrackerModal';

interface NigeriaServicesViewProps {
  onNavigateHome?: () => void;
  onOpenAdminServices?: () => void;
  isAdmin?: boolean;
}

export const NigeriaServicesView: React.FC<NigeriaServicesViewProps> = ({
  onNavigateHome,
  onOpenAdminServices,
  isAdmin = false,
}) => {
  const [activeTab, setActiveTab] = useState<'services' | 'providers'>('services');
  const [selectedCategory, setSelectedCategory] = useState<string>('All Services');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Data state
  const [services, setServices] = useState<TechService[]>([]);
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [selectedServiceForRequest, setSelectedServiceForRequest] = useState<TechService | null>(null);
  const [selectedProviderForRequest, setSelectedProviderForRequest] = useState<ServiceProvider | null>(null);

  const [providerProfileModalOpen, setProviderProfileModalOpen] = useState(false);
  const [viewingProvider, setViewingProvider] = useState<ServiceProvider | null>(null);

  const [trackerModalOpen, setTrackerModalOpen] = useState(false);
  const [trackingReference, setTrackingReference] = useState('');

  // Admin deletion state
  const [serviceToDelete, setServiceToDelete] = useState<TechService | null>(null);
  const [isDeletingService, setIsDeletingService] = useState(false);
  const [deleteNotice, setDeleteNotice] = useState('');

  const handleConfirmDelete = async () => {
    if (!serviceToDelete) return;
    setIsDeletingService(true);
    try {
      const sid = serviceToDelete.id;
      setServices(prev => prev.filter(s => s.id !== sid));
      await deleteTechServiceFromFirestore(sid, 'admin');
      setDeleteNotice(`Service "${serviceToDelete.title}" was removed from the marketplace.`);
      setServiceToDelete(null);
      setTimeout(() => setDeleteNotice(''), 4000);
    } catch (err) {
      console.error('Failed to delete service:', err);
      await loadData();
    } finally {
      setIsDeletingService(false);
    }
  };

  // Fetch initial services & providers
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [fetchedServices, fetchedProviders] = await Promise.all([
        getTechServicesFromFirestore(false),
        getServiceProvidersFromFirestore(false)
      ]);
      setServices(fetchedServices);
      setProviders(fetchedProviders);
    } catch (err) {
      console.error('Error loading Nigeria Services data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleSync = () => loadData();
    window.addEventListener('nexovira:services-changed', handleSync);
    window.addEventListener('nexovira:providers-changed', handleSync);
    return () => {
      window.removeEventListener('nexovira:services-changed', handleSync);
      window.removeEventListener('nexovira:providers-changed', handleSync);
    };
  }, []);

  // Filtered Services
  const filteredServices = useMemo(() => {
    return services.filter((s) => {
      const matchesCategory =
        selectedCategory === 'All Services' || s.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        s.title.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q) ||
        s.providerName.toLowerCase().includes(q);

      return matchesCategory && matchesSearch;
    });
  }, [services, selectedCategory, searchQuery]);

  // Filtered Providers
  const filteredProviders = useMemo(() => {
    return providers.filter((p) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.title.toLowerCase().includes(q) ||
        p.specialization.toLowerCase().includes(q) ||
        p.skills.some((skill) => skill.toLowerCase().includes(q)) ||
        p.location.toLowerCase().includes(q);

      return matchesSearch;
    });
  }, [providers, searchQuery]);

  const handleOpenBookingForService = (service: TechService) => {
    setSelectedServiceForRequest(service);
    setSelectedProviderForRequest(null);
    setRequestModalOpen(true);
  };

  const handleOpenBookingForProvider = (provider: ServiceProvider) => {
    setSelectedServiceForRequest(null);
    setSelectedProviderForRequest(provider);
    setRequestModalOpen(true);
  };

  const handleViewProviderProfile = (provider: ServiceProvider) => {
    setViewingProvider(provider);
    setProviderProfileModalOpen(true);
  };

  const handleOpenTrackerWithRef = (refStr: string) => {
    setTrackingReference(refStr);
    setTrackerModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-20">
      
      {/* Top Breadcrumb & Country Selector Banner */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            {onNavigateHome && (
              <>
                <button
                  onClick={onNavigateHome}
                  className="hover:text-blue-600 dark:hover:text-blue-400 font-semibold"
                >
                  Ecosystem Home
                </button>
                <ChevronRight className="w-3.5 h-3.5" />
              </>
            )}
            <span className="font-bold text-slate-900 dark:text-white">
              Book a Service
            </span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-blue-600 dark:text-blue-400 font-bold">
              Nigeria Hub
            </span>
          </div>

          {/* Hub Country Badge & Quick Actions */}
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 font-bold text-[11px]">
              <span className="text-sm">🇳🇬</span>
              <span>Nigeria Service Hub</span>
              <span className="text-[10px] bg-emerald-500/20 px-1.5 py-0.5 rounded font-mono">Active</span>
            </div>

            <button
              onClick={() => setTrackerModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-[11px] transition-colors"
            >
              <Activity className="w-3 h-3 text-blue-500" />
              <span>Track Request</span>
            </button>

            {isAdmin && onOpenAdminServices && (
              <button
                onClick={onOpenAdminServices}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] shadow-sm transition-colors"
              >
                <span>Management Panel</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-b from-slate-900 via-blue-950 to-slate-900 text-white py-14 sm:py-20 px-4 sm:px-6 lg:px-8 shadow-inner">
        {/* Subtle Tech Grid / Background Pattern */}
        <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:24px_24px]"></div>

        <div className="max-w-4xl mx-auto text-center relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-black uppercase tracking-wider backdrop-blur-sm animate-fadeIn">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>Nexovira Services Nigeria • Managed Booking</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
            Connect with Qualified Experts in Nigeria.
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl mx-auto">
            Nexovira Services connects customers with qualified professionals through a managed, transparent, and technology-enabled service-booking experience. Every project brief is reviewed and coordinated by Nexovira Management.
          </p>

          {/* 3 Steps Flow Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 text-left">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <div className="w-7 h-7 rounded-xl bg-blue-500/20 text-blue-400 font-black flex items-center justify-center text-xs mb-2">1</div>
              <h4 className="font-bold text-xs text-white">Select Your Service</h4>
              <p className="text-[11px] text-slate-300 mt-1">Writing, affiliate growth, technology development, digital solutions, or custom briefs.</p>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <div className="w-7 h-7 rounded-xl bg-blue-500/20 text-blue-400 font-black flex items-center justify-center text-xs mb-2">2</div>
              <h4 className="font-bold text-xs text-white">Discuss with Management</h4>
              <p className="text-[11px] text-slate-300 mt-1">Our team reviews your project specifications, scope, budget, and timeline requirements.</p>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-400 font-black flex items-center justify-center text-xs mb-2">3</div>
              <h4 className="font-bold text-xs text-white">Assigned Approved Specialist</h4>
              <p className="text-[11px] text-slate-300 mt-1">Matched with a vetted specialist in Nigeria with milestone guarantees and transparent tracking.</p>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={() => {
                setSelectedServiceForRequest(null);
                setSelectedProviderForRequest(null);
                setRequestModalOpen(true);
              }}
              className="px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs flex items-center gap-2 shadow-lg shadow-blue-500/25 transition-all hover:scale-105"
            >
              <Send className="w-4 h-4" />
              <span>Book a Custom Service / Submit Brief</span>
            </button>

            <button
              onClick={() => setActiveTab(activeTab === 'services' ? 'providers' : 'services')}
              className="px-6 py-3 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 text-white font-bold text-xs flex items-center gap-2 border border-slate-700 transition-colors"
            >
              <UserCheck className="w-4 h-4 text-blue-400" />
              <span>{activeTab === 'services' ? 'Browse Approved Specialists' : 'Browse Service Packages'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Catalog & Provider Directory Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-8">
        
        {/* Tabs & Search Controls */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
          
          {/* Dual Main Tabs */}
          <div className="inline-flex p-1.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
            <button
              onClick={() => setActiveTab('services')}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'services'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              <span>Available Services ({filteredServices.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('providers')}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'providers'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>Approved Experts & Providers ({filteredProviders.length})</span>
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative min-w-[280px] sm:min-w-[340px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={activeTab === 'services' ? 'Search writing, tech, affiliate support...' : 'Search specialists by name, skill, or state...'}
              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 shadow-sm"
            />
          </div>
        </div>

        {/* Tab 1: Available Services View */}
        {activeTab === 'services' && (
          <div className="space-y-6">
            {/* Category Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              {NIGERIA_SERVICE_CATEGORIES.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    selectedCategory === category
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-blue-300'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>

            {/* Services Grid */}
            {isLoading ? (
              <div className="py-20 text-center space-y-3">
                <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
                <p className="text-xs text-slate-500">Loading approved services in Nigeria...</p>
              </div>
            ) : filteredServices.length === 0 ? (
              <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-500 flex items-center justify-center mx-auto">
                  <Briefcase className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  No matching services found
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Have a specific need not listed in our catalog? Submit a custom project brief directly to Nexovira Management.
                </p>
                <button
                  onClick={() => {
                    setSelectedServiceForRequest(null);
                    setSelectedProviderForRequest(null);
                    setRequestModalOpen(true);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs"
                >
                  Submit Custom Project Brief
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredServices.map((service) => (
                  <div
                    key={service.id}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden hover:border-blue-500/50 hover:shadow-xl transition-all flex flex-col group"
                  >
                    {/* Image Header */}
                    <div className="relative aspect-[16/9] overflow-hidden bg-slate-950">
                      <img
                        src={service.image}
                        alt={service.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-md px-2.5 py-1 rounded-lg text-[10px] font-extrabold text-blue-400 border border-blue-500/30">
                        {service.category}
                      </div>

                      <div className="absolute top-3 right-3 bg-emerald-950/80 backdrop-blur-md px-2 py-0.5 rounded-lg text-[10px] font-bold text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                        <span>🇳🇬</span>
                        <span>Nigeria Hub</span>
                      </div>

                      {/* Admin Delete Action */}
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setServiceToDelete(service);
                          }}
                          className="absolute bottom-3 right-3 bg-red-600/90 hover:bg-red-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow flex items-center gap-1 transition-colors cursor-pointer z-10"
                          title="Delete Service"
                          aria-label="Remove Service"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4 text-left">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-blue-500" />
                            <span>{service.deliveryDays} Days Turnaround</span>
                          </span>
                          <span className="flex items-center gap-1 text-amber-500 font-bold">
                            <Star className="w-3 h-3 fill-current" />
                            <span>{service.rating?.toFixed(2) || '5.0'}</span>
                            <span className="text-slate-400 font-normal">({service.reviewCount || 30})</span>
                          </span>
                        </div>

                        <h3 className="font-bold text-slate-900 dark:text-white text-sm line-clamp-2 leading-snug">
                          {service.title}
                        </h3>

                        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed">
                          {service.description}
                        </p>

                        {/* Deliverables snippet */}
                        {service.keyFeatures && service.keyFeatures.length > 0 && (
                          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1">
                            {service.keyFeatures.slice(0, 2).map((feat, idx) => (
                              <div key={idx} className="flex items-center gap-1.5 text-[11px] text-slate-700 dark:text-slate-300">
                                <CheckCircle2 className="w-3 h-3 text-blue-500 shrink-0" />
                                <span className="truncate">{feat}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Bottom Price & Call To Action */}
                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                        <div>
                          <span className="text-[10px] text-slate-400 font-semibold block uppercase">Starting From</span>
                          <span className="text-sm font-black text-slate-900 dark:text-white">
                            ₦{(service.startingPriceNGN || service.startingPrice * 1500).toLocaleString()}
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            (~${service.startingPrice} USD)
                          </span>
                        </div>

                        <button
                          onClick={() => handleOpenBookingForService(service)}
                          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-blue-500/20 transition-all hover:scale-105"
                        >
                          <Send className="w-3 h-3" />
                          <span>Discuss with Management</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Approved Experts & Service Providers */}
        {activeTab === 'providers' && (
          <div className="space-y-6">
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 rounded-3xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>Vetted Talent Network in Nigeria</span>
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
                  Every specialist undergoes identity verification, past work inspection, and client milestone accountability. Before any project starts, Nexovira Management reviews the project scope and sets protected terms.
                </p>
              </div>

              <button
                onClick={() => {
                  setSelectedServiceForRequest(null);
                  setSelectedProviderForRequest(null);
                  setRequestModalOpen(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs whitespace-nowrap shadow-sm"
              >
                Match with an Expert
              </button>
            </div>

            {/* Providers Grid */}
            {filteredProviders.length === 0 ? (
              <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 space-y-2">
                <p className="text-xs text-slate-500">No service providers match your search.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProviders.map((provider) => (
                  <div
                    key={provider.id}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 flex flex-col justify-between space-y-4 hover:border-blue-500/50 hover:shadow-xl transition-all group text-left"
                  >
                    {/* Top Row: Avatar & Details */}
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="relative">
                          <img
                            src={provider.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80'}
                            alt={provider.name}
                            className="w-16 h-16 rounded-2xl object-cover border-2 border-slate-200 dark:border-slate-800 shadow-md group-hover:scale-105 transition-transform"
                          />
                          {provider.verifiedByManagement && (
                            <div className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-blue-600 text-white shadow">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </div>
                          )}
                        </div>

                        <span
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${
                            provider.availability === 'available'
                              ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                              : provider.availability === 'part_time'
                              ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                              : 'bg-slate-500/10 text-slate-500 border-slate-500/30'
                          }`}
                        >
                          {provider.availability === 'available' ? 'Available' : provider.availability === 'part_time' ? 'Part-Time' : 'Booked'}
                        </span>
                      </div>

                      <div>
                        <h4 className="font-extrabold text-slate-900 dark:text-white text-sm">
                          {provider.name}
                        </h4>
                        <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold">
                          {provider.title}
                        </p>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            <span>{provider.location}</span>
                          </span>
                          <span>•</span>
                          <span>{provider.experienceYears}y exp</span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed">
                        {provider.bio}
                      </p>

                      {/* Skills Tags */}
                      {provider.skills && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {provider.skills.slice(0, 4).map((skill, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-medium text-slate-700 dark:text-slate-300"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                      {/* Optional LinkedIn Button */}
                      {provider.linkedInUrl && provider.hasAuthorizedLinkedIn ? (
                        <a
                          href={provider.linkedInUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-[#0A66C2] hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                          title="View Verified LinkedIn Profile"
                        >
                          <Linkedin className="w-4 h-4" />
                        </a>
                      ) : (
                        <button
                          onClick={() => handleViewProviderProfile(provider)}
                          className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white text-xs font-bold"
                          title="View Full Profile"
                        >
                          Profile
                        </button>
                      )}

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleViewProviderProfile(provider)}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors"
                        >
                          View Bio
                        </button>
                        <button
                          onClick={() => handleOpenBookingForProvider(provider)}
                          className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-transform hover:scale-105"
                        >
                          <Send className="w-3 h-3" />
                          <span>Discuss</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Global Scalability & Trust Callout Banner */}
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-sm">
          <div className="space-y-2 max-w-2xl text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-xs border border-blue-500/20">
              <Globe2 className="w-3.5 h-3.5" />
              <span>Expanding African Digital Ecosystem</span>
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white">
              Why Book via Nexovira Services?
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              We eliminate freelance uncertainty. Nexovira coordinates project briefs, locks milestones in escrow, validates code and copy deliverables, and guarantees full resolution before funds are released. Currently serving Nigeria, with expansion across Africa underway.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <button
              onClick={() => setTrackerModalOpen(true)}
              className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
            >
              <FileText className="w-4 h-4 text-blue-500" />
              <span>Track Existing Booking</span>
            </button>

            <button
              onClick={() => {
                setSelectedServiceForRequest(null);
                setSelectedProviderForRequest(null);
                setRequestModalOpen(true);
              }}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-all hover:scale-105"
            >
              <Send className="w-4 h-4" />
              <span>Discuss with Management</span>
            </button>
          </div>
        </div>

      </div>

      {/* Booking / Service Request Modal */}
      <ServiceRequestModal
        isOpen={requestModalOpen}
        onClose={() => setRequestModalOpen(false)}
        selectedService={selectedServiceForRequest}
        selectedProvider={selectedProviderForRequest}
        onSuccess={(req) => {
          setTrackingReference(req.referenceNumber);
        }}
      />

      {/* Provider Profile Details Modal */}
      <ProviderProfileModal
        isOpen={providerProfileModalOpen}
        provider={viewingProvider}
        onClose={() => setProviderProfileModalOpen(false)}
        onRequestService={(provider) => {
          handleOpenBookingForProvider(provider);
        }}
      />

      {/* Service Request Tracker Modal */}
      <ServiceRequestTrackerModal
        isOpen={trackerModalOpen}
        initialRef={trackingReference}
        onClose={() => setTrackerModalOpen(false)}
      />

      {/* Admin Delete Service Confirmation Modal */}
      {serviceToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl text-left">
            <div className="flex items-center gap-3 text-rose-500">
              <div className="p-3 bg-rose-500/10 rounded-2xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Remove Service</h3>
                <p className="text-xs text-slate-400">Admin Marketplace Control</p>
              </div>
            </div>

            <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-1">
              <div className="text-xs font-bold text-white line-clamp-1">{serviceToDelete.title}</div>
              <div className="text-[11px] text-slate-400">Category: {serviceToDelete.category} • Provider: {serviceToDelete.providerName}</div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to remove this service from the Nigeria Services Hub? Customers will no longer be able to browse or request it.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isDeletingService}
                onClick={() => setServiceToDelete(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingService}
                onClick={handleConfirmDelete}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black shadow-lg shadow-rose-600/20 transition-colors flex items-center gap-2 cursor-pointer"
              >
                {isDeletingService ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Removing...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Confirm Remove</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
