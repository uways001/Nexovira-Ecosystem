import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  UserCheck, 
  Sparkles, 
  RefreshCw, 
  ChevronRight, 
  ShieldCheck, 
  X, 
  FileText, 
  ExternalLink,
  Layers,
  Send,
  Trash2,
  DollarSign,
  Mail,
  Edit3,
  Plus,
  Save,
  RotateCcw,
  Search,
  Eye,
  Check,
  UserPlus,
  MapPin,
  Briefcase,
  Globe,
  Award,
  AlertTriangle
} from 'lucide-react';
import { 
  getServiceRequestsFromFirestore, 
  deleteServiceRequestFromFirestore,
  clearAllServiceRequestsFromFirestore,
  getServiceProvidersFromFirestore, 
  updateServiceRequestStatusInFirestore, 
  assignServiceRequestInFirestore,
  saveServiceProviderToFirestore,
  deleteServiceProviderFromFirestore,
  getTechServiceCategoriesFromFirestore,
  saveTechServiceCategoryToFirestore,
  deleteTechServiceCategoryFromFirestore,
  resetTechServiceCategoriesToDefault,
  getEmailNotificationsFromFirestore,
  EmailNotificationRecord
} from '../../lib/firestoreService';
import { TECH_SERVICE_CATEGORIES, TechServiceCategory, SubExpertise } from '../../data/techServicesCategories';
import { ServiceRequest, ServiceProvider, ServiceRequestStatus, ExpertApplicationStatus } from '../../types';
import { ImageUploadField } from '../ImageUploadField';

export const AdminTechServicesManager: React.FC = () => {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [categories, setCategories] = useState<TechServiceCategory[]>([]);
  const [emailLogs, setEmailLogs] = useState<EmailNotificationRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Navigation Tabs
  const [activeSubTab, setActiveSubTab] = useState<'requests' | 'experts' | 'categories' | 'notifications'>('requests');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Expert Management States
  const [expertSearchQuery, setExpertSearchQuery] = useState<string>('');
  const [expertFilterStatus, setExpertFilterStatus] = useState<string>('all');
  const [expertSpecializationFilter, setExpertSpecializationFilter] = useState<string>('all');
  const [expertToDelete, setExpertToDelete] = useState<ServiceProvider | null>(null);
  const [deletingExpert, setDeletingExpert] = useState<boolean>(false);
  const [editingExpert, setEditingExpert] = useState<Partial<ServiceProvider> | null>(null);
  const [isCreatingExpert, setIsCreatingExpert] = useState<boolean>(false);
  const [expertSaving, setExpertSaving] = useState<boolean>(false);
  const [expertNotice, setExpertNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Selected Request for Assignment / AI Match
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
  const [aiMatching, setAiMatching] = useState<boolean>(false);
  const [aiMatchResults, setAiMatchResults] = useState<{
    matches: { providerId: string; score: number; rationale: string; keySkillMatches?: string[] }[];
    summary: string;
  } | null>(null);
  const [assignmentProviderId, setAssignmentProviderId] = useState<string>('');
  const [assignmentNotes, setAssignmentNotes] = useState<string>('');
  const [updatingAction, setUpdatingAction] = useState<boolean>(false);
  const [adminStatusNote, setAdminStatusNote] = useState<string>('');

  // Dynamic Category Editing & Deletion Modal State
  const [editingCategory, setEditingCategory] = useState<TechServiceCategory | null>(null);
  const [isCreatingCategory, setIsCreatingCategory] = useState<boolean>(false);
  const [categorySaving, setCategorySaving] = useState<boolean>(false);
  const [categoryToDelete, setCategoryToDelete] = useState<TechServiceCategory | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<boolean>(false);

  // Service Request Deletion & Mock Clearing State
  const [requestToDelete, setRequestToDelete] = useState<ServiceRequest | null>(null);
  const [deletingRequest, setDeletingRequest] = useState<boolean>(false);
  const [showClearAllRequestsModal, setShowClearAllRequestsModal] = useState<boolean>(false);
  const [clearingAllRequests, setClearingAllRequests] = useState<boolean>(false);

  // Email test sending state
  const [sendingTestEmail, setSendingTestEmail] = useState<boolean>(false);
  const [emailTestSuccess, setEmailTestSuccess] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [reqs, provs, cats, logs] = await Promise.all([
        getServiceRequestsFromFirestore(),
        getServiceProvidersFromFirestore(),
        getTechServiceCategoriesFromFirestore(),
        getEmailNotificationsFromFirestore()
      ]);
      setRequests(reqs);
      setProviders(provs);
      setCategories(cats && cats.length > 0 ? cats : TECH_SERVICE_CATEGORIES);
      setEmailLogs(logs);
    } catch (err) {
      console.warn('Error loading admin tech services data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleCatChanged = () => {
      getTechServiceCategoriesFromFirestore().then(cats => setCategories(cats));
    };

    const handleProvidersChanged = () => {
      getServiceProvidersFromFirestore(true).then(provs => setProviders(provs));
    };

    window.addEventListener('nexovira:tech-categories-changed', handleCatChanged);
    window.addEventListener('nexovira:providers-changed', handleProvidersChanged);
    return () => {
      window.removeEventListener('nexovira:tech-categories-changed', handleCatChanged);
      window.removeEventListener('nexovira:providers-changed', handleProvidersChanged);
    };
  }, []);

  // Filter requests
  const filteredRequests = requests.filter(r => {
    const matchesStatus = filterStatus === 'all' || r.status === filterStatus;
    const matchesSearch = !searchQuery.trim() || 
      (r.serviceTitle || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.referenceNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.customerName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.serviceCategory || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Filter providers for Experts tab
  const filteredProviders = providers.filter(p => {
    const matchesStatus = expertFilterStatus === 'all' || p.applicationStatus === expertFilterStatus;
    const matchesSpec = expertSpecializationFilter === 'all' || p.specialization === expertSpecializationFilter;
    const q = expertSearchQuery.toLowerCase().trim();
    const matchesQuery = !q ||
      (p.name || '').toLowerCase().includes(q) ||
      (p.professionalName || '').toLowerCase().includes(q) ||
      (p.title || '').toLowerCase().includes(q) ||
      (p.specialization || '').toLowerCase().includes(q) ||
      (p.location || '').toLowerCase().includes(q) ||
      (p.skills || []).some(s => s.toLowerCase().includes(q));
    return matchesStatus && matchesSpec && matchesQuery;
  });

  // Unique specializations for filter dropdown
  const uniqueSpecializations = Array.from(
    new Set(providers.map(p => p.specialization).filter(Boolean))
  );

  // Run AI matching for selected request
  const handleRunAiMatching = async (req: ServiceRequest) => {
    setSelectedRequest(req);
    setAiMatching(true);
    setAiMatchResults(null);
    try {
      const response = await fetch('/api/v1/tech-services/ai-match-experts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectRequest: req,
          serviceRequest: req,
          availableExperts: providers
        })
      });

      if (response.ok) {
        const json = await response.json();
        const rawMatches = json.matches || json.data?.matches || [];
        const summaryText = json.summary || json.data?.summary || 'AI evaluated candidate profiles based on verified project track record and required technical specializations.';
        
        setAiMatchResults({
          matches: rawMatches.map((m: any) => ({
            providerId: m.providerId || m.expertId || m.id,
            score: m.score || m.matchScore || 85,
            rationale: m.rationale || m.matchReason || 'High match with requirements.',
            keySkillMatches: m.keySkillMatches || []
          })),
          summary: summaryText
        });
      }
    } catch (err) {
      console.warn('AI matching failed:', err);
    } finally {
      setAiMatching(false);
    }
  };

  // Assign expert to project brief
  const handleConfirmAssignment = async () => {
    if (!selectedRequest || !assignmentProviderId) return;
    setUpdatingAction(true);
    try {
      const targetProv = providers.find(p => p.id === assignmentProviderId);
      const provName = targetProv ? (targetProv.professionalName || targetProv.name) : 'Assigned Specialist';

      await assignServiceRequestInFirestore(
        selectedRequest.id,
        assignmentProviderId,
        provName,
        assignmentNotes || 'Assigned by Nexovira administration based on verified skill match and track record.'
      );

      // Trigger notification to Nexovira management
      try {
        await fetch('/api/v1/tech-services/notify-management', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'expert_assignment',
            payload: {
              referenceNumber: selectedRequest.referenceNumber,
              serviceTitle: selectedRequest.serviceTitle,
              assignedExpertName: provName,
              assignedExpertId: assignmentProviderId,
              customerEmail: selectedRequest.customerEmail,
              notes: assignmentNotes
            }
          })
        });
      } catch (err) {
        console.warn('Assignment email log dispatched:', err);
      }

      await loadData();
      alert(`Successfully assigned ${provName} to brief ${selectedRequest.referenceNumber}.`);
      setSelectedRequest(null);
      setAiMatchResults(null);
      setAssignmentProviderId('');
      setAssignmentNotes('');
    } catch (err: any) {
      alert('Failed to assign provider: ' + err.message);
    } finally {
      setUpdatingAction(false);
    }
  };

  // Update Status
  const handleUpdateStatus = async (reqId: string, newStatus: ServiceRequestStatus) => {
    try {
      await updateServiceRequestStatusInFirestore(reqId, newStatus, adminStatusNote || undefined);
      await loadData();
      alert(`Request status updated to ${newStatus}`);
      setAdminStatusNote('');
    } catch (err: any) {
      alert('Failed to update status: ' + err.message);
    }
  };

  // Approve / Reject Expert Application
  const handleUpdateExpertStatus = async (prov: ServiceProvider, status: ExpertApplicationStatus) => {
    try {
      await saveServiceProviderToFirestore({
        ...prov,
        applicationStatus: status,
        isPublic: status === 'Approved',
        verifiedByManagement: status === 'Approved'
      }, 'admin');
      await loadData();
      setExpertNotice({
        type: 'success',
        message: `Specialist "${prov.name}" status updated to: ${status}`
      });
      setTimeout(() => setExpertNotice(null), 3500);
    } catch (err: any) {
      alert('Failed to update expert: ' + err.message);
    }
  };

  // Open Add Expert Modal with clean structure
  const handleOpenAddExpert = () => {
    setEditingExpert({
      id: `prov-${Date.now()}`,
      name: '',
      professionalName: '',
      title: '',
      email: '',
      phone: '',
      location: 'Lagos, Nigeria',
      country: 'Nigeria',
      countryCode: 'NG',
      specialization: 'Full-Stack Software Engineering',
      primaryExpertise: 'Full-Stack Software Engineering',
      secondaryExpertise: [],
      bio: '',
      skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL'],
      experienceLevel: 'Senior',
      experienceYears: 5,
      experienceSummary: 'Verified industry specialist with demonstrated track record of production-grade deliveries.',
      portfolio: [],
      availability: 'available',
      projectPreferences: ['Remote', 'Contract', 'Short-term', 'Full-time'],
      servicesOffered: [],
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
      linkedInUrl: '',
      githubUrl: '',
      behanceUrl: '',
      dribbbleUrl: '',
      websiteUrl: '',
      hasAuthorizedLinkedIn: false,
      isPublic: true,
      applicationStatus: 'Approved',
      rating: 5.0,
      completedProjectsCount: 12,
      activeProjectsCount: 1,
      totalEarningsNGN: 0,
      verifiedByManagement: true,
      createdAt: new Date().toISOString()
    });
    setIsCreatingExpert(true);
  };

  // Open Edit Expert Modal
  const handleOpenEditExpert = (prov: ServiceProvider) => {
    setEditingExpert({ ...prov });
    setIsCreatingExpert(false);
  };

  // Save Expert to Firestore and Cloud Sync
  const handleSaveExpert = async (expertData: Partial<ServiceProvider>) => {
    if (!expertData.name?.trim() || !expertData.title?.trim()) {
      alert('Please provide at least the Expert Full Name and Professional Title.');
      return;
    }
    setExpertSaving(true);
    try {
      await saveServiceProviderToFirestore(expertData, 'admin');
      const updated = await getServiceProvidersFromFirestore(true);
      setProviders(updated);
      setEditingExpert(null);
      setIsCreatingExpert(false);
      setExpertNotice({ 
        type: 'success', 
        message: `Verified specialist "${expertData.name}" successfully ${isCreatingExpert ? 'added' : 'updated'} and synced to Cloud.` 
      });
      setTimeout(() => setExpertNotice(null), 4000);
    } catch (err: any) {
      alert('Failed to save specialist: ' + err.message);
    } finally {
      setExpertSaving(false);
    }
  };

  // Delete Expert Confirmation Handler
  const handleDeleteExpert = (prov: ServiceProvider) => {
    setExpertToDelete(prov);
  };

  const handleConfirmDeleteExpert = async () => {
    if (!expertToDelete) return;
    setDeletingExpert(true);
    try {
      await deleteServiceProviderFromFirestore(expertToDelete.id, 'admin');
      setProviders(prev => prev.filter(p => p.id !== expertToDelete.id));
      setExpertNotice({ 
        type: 'success', 
        message: `Specialist "${expertToDelete.name}" deleted and synced globally via Cloud Sync.` 
      });
      setExpertToDelete(null);
      setTimeout(() => setExpertNotice(null), 4000);
    } catch (err: any) {
      alert('Failed to delete specialist: ' + err.message);
    } finally {
      setDeletingExpert(false);
    }
  };

  // Category Management Handlers
  const handleSaveCategory = async (cat: TechServiceCategory) => {
    setCategorySaving(true);
    try {
      await saveTechServiceCategoryToFirestore(cat);
      const updated = await getTechServiceCategoriesFromFirestore();
      setCategories(updated);
      setEditingCategory(null);
      setIsCreatingCategory(false);
      alert('Category saved successfully.');
    } catch (err: any) {
      alert('Failed to save category: ' + err.message);
    } finally {
      setCategorySaving(false);
    }
  };

  const handleDeleteCategory = (cat: TechServiceCategory) => {
    setCategoryToDelete(cat);
  };

  const handleConfirmDeleteCategory = async () => {
    if (!categoryToDelete) return;
    setDeletingCategory(true);
    try {
      await deleteTechServiceCategoryFromFirestore(categoryToDelete.id, 'admin');
      setCategories(prev => prev.filter(c => c.id !== categoryToDelete.id));
      setCategoryToDelete(null);
      setExpertNotice({
        type: 'success',
        message: `Category "${categoryToDelete.title}" deleted successfully and synced to Cloud.`
      });
      setTimeout(() => setExpertNotice(null), 4000);
    } catch (err: any) {
      setExpertNotice({ type: 'error', message: 'Failed to delete category: ' + err.message });
    } finally {
      setDeletingCategory(false);
    }
  };

  const handleDeleteRequest = (req: ServiceRequest) => {
    setRequestToDelete(req);
  };

  const handleConfirmDeleteRequest = async () => {
    if (!requestToDelete) return;
    setDeletingRequest(true);
    try {
      await deleteServiceRequestFromFirestore(requestToDelete.id, 'admin');
      setRequests(prev => prev.filter(r => r.id !== requestToDelete.id));
      setExpertNotice({
        type: 'success',
        message: `Service brief "${requestToDelete.referenceNumber}" permanently deleted and synced.`
      });
      setRequestToDelete(null);
      setTimeout(() => setExpertNotice(null), 4000);
    } catch (err: any) {
      setExpertNotice({ type: 'error', message: 'Failed to delete request: ' + err.message });
    } finally {
      setDeletingRequest(false);
    }
  };

  const handleClearAllRequests = async () => {
    setClearingAllRequests(true);
    try {
      const count = await clearAllServiceRequestsFromFirestore('admin');
      setRequests([]);
      setShowClearAllRequestsModal(false);
      setExpertNotice({
        type: 'success',
        message: `Successfully cleared all ${count} mock service briefs and synced across Cloud.`
      });
      setTimeout(() => setExpertNotice(null), 4000);
    } catch (err: any) {
      setExpertNotice({ type: 'error', message: 'Failed to clear service briefs: ' + err.message });
    } finally {
      setClearingAllRequests(false);
    }
  };

  const handleResetCategories = async () => {
    try {
      await resetTechServiceCategoriesToDefault();
      const updated = await getTechServiceCategoriesFromFirestore();
      setCategories(updated);
      setExpertNotice({
        type: 'success',
        message: 'Categories reset to default baseline.'
      });
      setTimeout(() => setExpertNotice(null), 4000);
    } catch (err: any) {
      setExpertNotice({ type: 'error', message: 'Failed to reset categories: ' + err.message });
    }
  };

  // Dispatch Test Email to nexoviratech@gmail.com
  const handleSendTestEmail = async () => {
    setSendingTestEmail(true);
    setEmailTestSuccess(null);
    try {
      const res = await fetch('/api/v1/tech-services/notify-management', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'new_project_request',
          payload: {
            referenceNumber: `TEST-NX-${Math.floor(100000 + Math.random() * 900000)}`,
            customerName: 'Nexovira System Auditor',
            customerEmail: 'nexoviratech@gmail.com',
            customerPhone: '+234 800 000 0000',
            customerLocation: 'Victoria Island, Lagos, Nigeria',
            serviceTitle: 'Test Service Verification Request',
            serviceCategory: 'Artificial Intelligence',
            projectComplexity: 'Medium',
            projectType: 'One-time Project',
            projectScope: 'Medium',
            budgetExpectation: '₦500,000 – ₦1,000,000',
            timeline: 'Within Two to Four Weeks',
            projectDescription: 'This is an automated system verification test confirming email routing to nexoviratech@gmail.com is operating normally.',
            requiredExpertise: ['AI & ML Modeling', 'API Integration', 'Cloud Architecture'],
            detectedRequirements: ['Automated Telemetry', 'Verification Pass']
          }
        })
      });

      if (res.ok) {
        const json = await res.json();
        setEmailTestSuccess(`Notification test dispatched successfully to ${json.adminEmail || 'nexoviratech@gmail.com'}. Check server logs or mailbox.`);
        const logs = await getEmailNotificationsFromFirestore();
        setEmailLogs(logs);
      } else {
        alert('Failed to send test email.');
      }
    } catch (err: any) {
      alert('Error triggering test email: ' + err.message);
    } finally {
      setSendingTestEmail(false);
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* Sub Tab Switcher */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveSubTab('requests')}
            className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 sm:gap-2 whitespace-nowrap ${
              activeSubTab === 'requests'
                ? 'bg-cyan-500 text-slate-950 font-black'
                : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Service Briefs ({requests.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('experts')}
            className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 sm:gap-2 whitespace-nowrap ${
              activeSubTab === 'experts'
                ? 'bg-cyan-500 text-slate-950 font-black'
                : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Vetted Talent ({providers.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('categories')}
            className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 sm:gap-2 whitespace-nowrap ${
              activeSubTab === 'categories'
                ? 'bg-cyan-500 text-slate-950 font-black'
                : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Dynamic Categories ({categories.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('notifications')}
            className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 sm:gap-2 whitespace-nowrap ${
              activeSubTab === 'notifications'
                ? 'bg-cyan-500 text-slate-950 font-black'
                : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            <Mail className="w-4 h-4" />
            <span>Email Alerts (nexoviratech@gmail.com)</span>
          </button>
        </div>

        <button
          onClick={loadData}
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1.5 ml-auto"
          title="Refresh data"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* SUB-TAB 1: Service Requests */}
      {activeSubTab === 'requests' && (
        <div className="space-y-4">
          {/* Controls Bar: Search & Status Filters */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search requests by title, ref code, customer name, or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-600 focus:border-cyan-500 outline-none"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              {['all', 'Submitted', 'Under Review', 'Expertise Matching', 'Assigned', 'Project In Progress', 'Completed'].map(st => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className={`px-3 py-1.5 rounded-lg font-bold whitespace-nowrap transition-colors ${
                    filterStatus === st
                      ? 'bg-cyan-500 text-slate-950'
                      : 'bg-slate-900 text-slate-400 hover:border-slate-700 border border-slate-800'
                  }`}
                >
                  {st === 'all' ? 'All Statuses' : st}
                </button>
              ))}

              {requests.length > 0 && (
                <button
                  onClick={() => setShowClearAllRequestsModal(true)}
                  className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold whitespace-nowrap transition-colors flex items-center gap-1.5 ml-2"
                  title="Clear all mock service briefs from Firestore and sync globally"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear All Mock Briefs ({requests.length})</span>
                </button>
              )}
            </div>
          </div>

          {/* Requests List */}
          {loading ? (
            <div className="p-12 text-center text-slate-500 text-xs">Loading service requests...</div>
          ) : filteredRequests.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs bg-slate-950 border border-slate-800 rounded-2xl">
              No service requests matching this filter.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRequests.map(req => (
                <div
                  key={req.id}
                  className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                        {req.referenceNumber}
                      </span>
                      <span className="text-xs font-bold text-slate-300">
                        {req.serviceCategory}
                      </span>
                      <span className="text-xs text-slate-500">•</span>
                      <span className="text-xs text-slate-400">
                        {new Date(req.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Status Badge */}
                    <span className={`self-start sm:self-auto text-xs font-bold px-2.5 py-1 rounded-full ${
                      req.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                      req.status === 'Assigned' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' :
                      req.status === 'Project In Progress' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
                      req.status === 'Expertise Matching' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                      req.status === 'Under Review' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                      'bg-slate-800 text-slate-300'
                    }`}>
                      {req.status}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-white">{req.serviceTitle}</h3>
                    <p className="text-xs text-slate-400 line-clamp-2 mt-1">{req.projectDescription}</p>
                  </div>

                  {/* Client & Scoping Details Pill Box */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                    <div>
                      <span className="text-slate-500 block text-[10px]">Client:</span>
                      <span className="font-bold text-slate-200">{req.customerName}</span>
                      <span className="block text-slate-400 text-[10px]">{req.customerEmail}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Budget & Timeline:</span>
                      <span className="font-bold text-emerald-400">{req.budgetExpectation}</span>
                      <span className="block text-slate-400 text-[10px]">{req.timeline}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Complexity & Type:</span>
                      <span className="font-bold text-slate-200">{req.projectComplexity || 'Medium'}</span>
                      <span className="block text-slate-400 text-[10px]">{req.projectType || 'One-time'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Assigned Specialist:</span>
                      <span className="font-bold text-cyan-300">
                        {req.assignedProviderName || 'None (Unassigned)'}
                      </span>
                    </div>
                  </div>

                  {/* Required Expertise Tags */}
                  {req.requiredExpertise && req.requiredExpertise.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] text-slate-500">Required Skills:</span>
                      {req.requiredExpertise.map((tag, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px]">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Action Bar */}
                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRunAiMatching(req)}
                        className="px-3.5 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-xs font-bold border border-cyan-500/20 flex items-center gap-1.5 transition-colors"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>AI Talent Matcher</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Status quick select */}
                      <select
                        value={req.status}
                        onChange={(e) => handleUpdateStatus(req.id, e.target.value as ServiceRequestStatus)}
                        className="bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 px-2.5 py-1.5 outline-none focus:border-cyan-500"
                      >
                        <option value="Submitted">Submitted</option>
                        <option value="Under Review">Under Review</option>
                        <option value="Expertise Matching">Expertise Matching</option>
                        <option value="Assigned">Assigned</option>
                        <option value="Project In Progress">Project In Progress</option>
                        <option value="Completed">Completed</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>

                      <button
                        onClick={() => handleDeleteRequest(req)}
                        className="p-2 rounded-lg bg-slate-950 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 border border-slate-800 transition-colors"
                        title="Delete this service brief"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: Vetted Talent Pool */}
      {activeSubTab === 'experts' && (
        <div className="space-y-4">
          {/* Notification Toast */}
          {expertNotice && (
            <div className={`p-4 rounded-2xl border flex items-center justify-between gap-3 text-xs font-bold animate-fadeIn ${
              expertNotice.type === 'success' 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}>
              <div className="flex items-center gap-2">
                {expertNotice.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span>{expertNotice.message}</span>
              </div>
              <button onClick={() => setExpertNotice(null)} className="p-1 hover:opacity-75">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Expert Management Header Toolbar */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-800">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-white">Nexovira Verified Specialists Network</h3>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-bold">
                  {filteredProviders.length} of {providers.length} Specialists
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Cloud Sync Active
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Manage vetted engineering, cloud, AI, and creative talent. All additions and deletions sync instantly across customer booking portals.
              </p>
            </div>

            <div className="flex items-center gap-2.5 w-full lg:w-auto flex-wrap sm:flex-nowrap">
              <button
                onClick={handleOpenAddExpert}
                className="w-full sm:w-auto px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <UserPlus className="w-4 h-4 text-slate-950" />
                <span>Add Verified Expert</span>
              </button>
            </div>
          </div>

          {/* Search and Filters Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800/80">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={expertSearchQuery}
                onChange={(e) => setExpertSearchQuery(e.target.value)}
                placeholder="Search expert by name, title, skill, or location..."
                className="w-full pl-9 pr-8 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-500"
              />
              {expertSearchQuery && (
                <button
                  onClick={() => setExpertSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <select
                value={expertFilterStatus}
                onChange={(e) => setExpertFilterStatus(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-2 outline-none focus:border-cyan-500"
              >
                <option value="all">All Statuses</option>
                <option value="Approved">Approved / Active</option>
                <option value="Under Review">Under Review</option>
                <option value="Suspended">Deactivated</option>
              </select>

              {uniqueSpecializations.length > 0 && (
                <select
                  value={expertSpecializationFilter}
                  onChange={(e) => setExpertSpecializationFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-2 outline-none focus:border-cyan-500 max-w-[180px] truncate"
                >
                  <option value="all">All Specializations</option>
                  {uniqueSpecializations.map((spec, i) => (
                    <option key={i} value={spec}>{spec}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Expert Cards Grid */}
          {filteredProviders.length === 0 ? (
            <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
              <UserCheck className="w-10 h-10 text-slate-600 mx-auto" />
              <h4 className="text-sm font-bold text-white">No Specialists Found</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                {expertSearchQuery || expertFilterStatus !== 'all' || expertSpecializationFilter !== 'all'
                  ? 'No verified specialist matches the current filters. Try resetting search parameters.'
                  : 'No verified experts in the system. Click "Add Verified Expert" to register a new specialist.'}
              </p>
              <button
                onClick={handleOpenAddExpert}
                className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl mt-2 transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Add First Expert</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredProviders.map(prov => (
                <div
                  key={prov.id}
                  className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700/80 transition-all space-y-3 relative group"
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={prov.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80'}
                        alt={prov.name}
                        className="w-12 h-12 rounded-xl object-cover border border-slate-700 shrink-0"
                      />
                      <div>
                        <h4 className="text-sm font-bold text-white flex items-center gap-1.5 flex-wrap">
                          <span>{prov.professionalName || prov.name}</span>
                          {prov.verifiedByManagement && (
                            <span title="Verified by Nexovira Management">
                              <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
                            </span>
                          )}
                        </h4>
                        <p className="text-xs text-cyan-400 font-medium">{prov.title}</p>
                        <p className="text-[11px] text-slate-500">
                          {prov.specialization} • {prov.location || 'Nigeria'}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        prov.applicationStatus === 'Approved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        prov.applicationStatus === 'Under Review' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                        'bg-slate-800 text-slate-400'
                      }`}>
                        {prov.applicationStatus || 'Approved'}
                      </span>
                      {prov.experienceYears && (
                        <span className="text-[10px] text-slate-500 font-mono">
                          {prov.experienceYears}+ yrs exp
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Bio */}
                  {prov.bio && (
                    <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                      {prov.bio}
                    </p>
                  )}

                  {/* Skills Tags */}
                  {prov.skills && prov.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {prov.skills.map((sk, i) => (
                        <span key={i} className="px-2 py-0.5 rounded bg-slate-950 text-slate-400 text-[10px] border border-slate-800">
                          {sk}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Contact & Portfolio Links */}
                  <div className="grid grid-cols-2 gap-2 text-slate-400 text-[11px] bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
                    <div className="truncate">Email: <span className="text-white select-all">{prov.email || 'N/A'}</span></div>
                    <div className="truncate">Phone: <span className="text-white select-all">{prov.phone || 'N/A'}</span></div>
                    {prov.githubUrl && (
                      <a href={prov.githubUrl} target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline flex items-center gap-1 truncate">
                        <span>GitHub</span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    )}
                    {prov.linkedInUrl && (
                      <a href={prov.linkedInUrl} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline flex items-center gap-1 truncate">
                        <span>LinkedIn</span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    )}
                    {prov.websiteUrl && (
                      <a href={prov.websiteUrl} target="_blank" rel="noreferrer" className="text-emerald-400 hover:underline flex items-center gap-1 truncate col-span-2">
                        <span>Portfolio Site</span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    )}
                  </div>

                  {/* Admin Verification & Management Actions */}
                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-slate-500 text-[11px]">
                      Availability: <strong className={`capitalize ${
                        prov.availability === 'available' ? 'text-emerald-400' :
                        prov.availability === 'busy' ? 'text-rose-400' : 'text-amber-400'
                      }`}>{prov.availability || 'available'}</strong>
                    </span>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Edit Button */}
                      <button
                        onClick={() => handleOpenEditExpert(prov)}
                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1"
                        title="Edit Expert Details"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>

                      {/* Approval status toggle */}
                      {prov.applicationStatus !== 'Approved' && (
                        <button
                          onClick={() => handleUpdateExpertStatus(prov, 'Approved')}
                          className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold text-xs rounded-lg transition-colors"
                        >
                          Approve
                        </button>
                      )}
                      {prov.applicationStatus === 'Approved' && (
                        <button
                          onClick={() => handleUpdateExpertStatus(prov, 'Suspended')}
                          className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold text-xs rounded-lg transition-colors"
                        >
                          Deactivate
                        </button>
                      )}

                      {/* Delete Button (Cloud Sync Connected) */}
                      <button
                        onClick={() => handleDeleteExpert(prov)}
                        className="px-2.5 py-1.5 bg-rose-500/15 hover:bg-rose-600 text-rose-300 hover:text-white font-bold text-xs rounded-lg border border-rose-500/30 transition-all flex items-center gap-1"
                        title="Delete Expert (Syncs to Cloud)"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 3: Dynamic Categories & Taxonomy */}
      {activeSubTab === 'categories' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-900 p-4 rounded-2xl border border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white">Dynamic Ecosystem Taxonomy</h3>
              <p className="text-xs text-slate-400">
                Categories are saved in Cloud Firestore and update live across all customer portals and forms.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => {
                  setEditingCategory({
                    id: `cat-${Date.now()}`,
                    title: '',
                    tagline: '',
                    shortDescription: '',
                    fullDescription: '',
                    description: '',
                    iconName: 'Code2',
                    badge: 'NEW',
                    sampleRequirements: [],
                    subExpertise: []
                  });
                  setIsCreatingCategory(true);
                }}
                className="px-3 py-1.5 bg-cyan-500 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 hover:bg-cyan-400 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add Category</span>
              </button>

              <button
                onClick={handleResetCategories}
                className="px-3 py-1.5 bg-slate-800 text-slate-300 font-bold text-xs rounded-xl flex items-center gap-1.5 hover:bg-slate-700 transition-colors"
                title="Reset to default categories"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset to Default</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categories.map((cat, idx) => (
              <div
                key={cat.id || idx}
                className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 relative group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-bold text-white">{cat.title}</h4>
                      {cat.badge && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                          {cat.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-cyan-400 mt-0.5">{cat.tagline}</p>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingCategory({ ...cat });
                        setIsCreatingCategory(false);
                      }}
                      className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-cyan-400 hover:bg-slate-700 transition-colors"
                      title="Edit Category"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(cat)}
                      className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Delete Category"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-400">{cat.shortDescription || cat.fullDescription || cat.description}</p>

                {/* Sub-Specializations */}
                {cat.subExpertise && cat.subExpertise.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Sub-Specializations ({cat.subExpertise.length}):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {cat.subExpertise.map((sub, sIdx) => (
                        <span
                          key={sIdx}
                          className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300"
                        >
                          {sub.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 4: Email Notifications Audit & Alerts */}
      {activeSubTab === 'notifications' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-900 p-4 rounded-2xl border border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">Management Email Notifications</h3>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Primary Notification Recipient: <strong className="text-cyan-400 font-mono">nexoviratech@gmail.com</strong>
              </p>
              <p className="text-[11px] text-slate-500">
                All client project briefs and specialist applications trigger automated email dispatches and are logged here.
              </p>
            </div>

            <button
              onClick={handleSendTestEmail}
              disabled={sendingTestEmail}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-2 transition-colors shrink-0"
            >
              <Send className={`w-3.5 h-3.5 ${sendingTestEmail ? 'animate-spin' : ''}`} />
              <span>{sendingTestEmail ? 'Dispatching...' : 'Dispatch Test Alert'}</span>
            </button>
          </div>

          {emailTestSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{emailTestSuccess}</span>
            </div>
          )}

          {/* Email Notification Log Table / Stream */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Recent Dispatches ({emailLogs.length})
            </h4>

            {emailLogs.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs bg-slate-950 border border-slate-800 rounded-2xl">
                No email notifications recorded yet. Submit a project brief or click "Dispatch Test Alert" above.
              </div>
            ) : (
              <div className="space-y-2">
                {emailLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                          {log.referenceNumber || 'ALERT'}
                        </span>
                        <span className="font-bold text-white">{log.subject}</span>
                      </div>
                      <p className="text-slate-400">{log.summary}</p>
                      <div className="flex items-center gap-3 text-[11px] text-slate-500">
                        <span>Recipient: <strong className="text-slate-300">{log.recipient}</strong></span>
                        <span>•</span>
                        <span>Channel: <strong className="text-slate-300">{log.deliveryChannel}</strong></span>
                        <span>•</span>
                        <span>{new Date(log.createdAt).toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="shrink-0">
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20 text-[10px]">
                        {log.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: AI Talent Matching & Assignment */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-fadeIn">
          <div 
            className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl my-8 text-white max-h-[90vh] overflow-y-auto space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => { setSelectedRequest(null); setAiMatchResults(null); }}
              className="absolute top-6 right-6 p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded border border-cyan-500/20 font-bold">
                  {selectedRequest.referenceNumber}
                </span>
                <span className="text-xs text-slate-400">• AI Specialist Matcher (Gemini 3.8 Flash)</span>
              </div>
              <h2 className="text-2xl font-black text-white mt-1">{selectedRequest.serviceTitle}</h2>
              <p className="text-xs text-slate-400">{selectedRequest.serviceCategory} • Budget: {selectedRequest.budgetExpectation}</p>
            </div>

            {/* AI Results Section */}
            {aiMatching ? (
              <div className="p-8 text-center bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin text-cyan-400 mx-auto" />
                <p className="text-xs font-bold text-white">Gemini 3.8 Flash is analyzing talent pool against project requirements...</p>
              </div>
            ) : aiMatchResults ? (
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-500/30 text-xs text-slate-300">
                  <strong className="text-cyan-400 block mb-1">AI Recommendation Summary:</strong>
                  {aiMatchResults.summary}
                </div>

                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ranked Specialists</h4>
                <div className="space-y-2">
                  {aiMatchResults.matches.map((m, idx) => {
                    const expertObj = providers.find(p => p.id === m.providerId);
                    if (!expertObj) return null;
                    const isSelected = assignmentProviderId === expertObj.id;

                    return (
                      <div
                        key={idx}
                        onClick={() => setAssignmentProviderId(expertObj.id)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-cyan-500/10 border-cyan-500 text-white'
                            : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={expertObj.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80'}
                            alt={expertObj.name}
                            className="w-10 h-10 rounded-lg object-cover"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-white">{expertObj.professionalName || expertObj.name}</span>
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                                {m.score}% Match
                              </span>
                            </div>
                            <p className="text-[11px] text-cyan-400">{expertObj.title}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{m.rationale}</p>
                          </div>
                        </div>

                        <div className="shrink-0">
                          <input
                            type="radio"
                            checked={isSelected}
                            onChange={() => setAssignmentProviderId(expertObj.id)}
                            className="w-4 h-4 text-cyan-500"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {/* Manual Assignment Override */}
            <div className="space-y-3 pt-4 border-t border-slate-800">
              <label className="text-xs font-bold text-slate-300 block">
                Select Specialist to Assign:
              </label>
              <select
                value={assignmentProviderId}
                onChange={(e) => setAssignmentProviderId(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white outline-none focus:border-cyan-500"
              >
                <option value="">-- Choose Vetted Specialist --</option>
                {providers.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {p.title} ({p.specialization})
                  </option>
                ))}
              </select>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Management Notes / Scope Directives:
                </label>
                <textarea
                  rows={2}
                  value={assignmentNotes}
                  onChange={(e) => setAssignmentNotes(e.target.value)}
                  placeholder="e.g. Assigned to lead frontend architecture. Target Milestone 1 review in 7 business days."
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white outline-none focus:border-cyan-500 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleConfirmAssignment}
                  disabled={!assignmentProviderId || updatingAction}
                  className="flex-1 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-black text-xs transition-colors"
                >
                  {updatingAction ? 'Assigning...' : 'Confirm Assignment & Notify Expert'}
                </button>
                <button
                  onClick={() => { setSelectedRequest(null); setAiMatchResults(null); }}
                  className="px-5 py-3 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Dynamic Category Editor / Creator */}
      {editingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-fadeIn">
          <div 
            className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl my-8 text-white max-h-[90vh] overflow-y-auto space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => { setEditingCategory(null); setIsCreatingCategory(false); }}
              className="absolute top-6 right-6 p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="text-xs font-mono text-cyan-400 font-bold uppercase">
                {isCreatingCategory ? 'New Category' : 'Edit Category'}
              </span>
              <h2 className="text-xl font-black text-white mt-1">
                {editingCategory.title || 'Category Settings'}
              </h2>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Category Title *</label>
                <input
                  type="text"
                  value={editingCategory.title}
                  onChange={(e) => setEditingCategory({ ...editingCategory, title: e.target.value })}
                  placeholder="e.g. Artificial Intelligence"
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Tagline *</label>
                <input
                  type="text"
                  value={editingCategory.tagline}
                  onChange={(e) => setEditingCategory({ ...editingCategory, tagline: e.target.value })}
                  placeholder="e.g. Enterprise Machine Learning & Agent Systems"
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Description *</label>
                <textarea
                  rows={2}
                  value={editingCategory.shortDescription || editingCategory.fullDescription || editingCategory.description || ''}
                  onChange={(e) => setEditingCategory({ 
                    ...editingCategory, 
                    shortDescription: e.target.value,
                    fullDescription: e.target.value,
                    description: e.target.value 
                  })}
                  placeholder="Detailed description of services offered under this category..."
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-cyan-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Badge (Optional)</label>
                <input
                  type="text"
                  value={editingCategory.badge || ''}
                  onChange={(e) => setEditingCategory({ ...editingCategory, badge: e.target.value })}
                  placeholder="e.g. POPULAR, ENTERPRISE, HOT"
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  onClick={() => handleSaveCategory(editingCategory)}
                  disabled={categorySaving || !editingCategory.title.trim()}
                  className="flex-1 py-3 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-black rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  <span>{categorySaving ? 'Saving...' : 'Save Category'}</span>
                </button>
                <button
                  onClick={() => { setEditingCategory(null); setIsCreatingCategory(false); }}
                  className="px-5 py-3 bg-slate-800 text-slate-300 font-bold rounded-xl"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Delete Expert Confirmation (Connected to Cloud Sync) */}
      {expertToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/30 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Delete Verified Expert?</h3>
                <p className="text-xs text-rose-400/90 font-mono">Global Cloud Sync Action</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to permanently delete <strong className="text-white">{expertToDelete.name}</strong> from the talent ecosystem?
            </p>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center gap-3">
              <img
                src={expertToDelete.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80'}
                alt={expertToDelete.name}
                className="w-10 h-10 rounded-lg object-cover border border-slate-700 shrink-0"
              />
              <div className="min-w-0 flex-1 text-xs">
                <p className="text-white font-bold truncate">{expertToDelete.name}</p>
                <p className="text-cyan-400 truncate">{expertToDelete.title}</p>
                <p className="text-slate-500 text-[11px] truncate">{expertToDelete.specialization} • {expertToDelete.email}</p>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
              ⚡ This action will remove the expert from the talent database and record a Cloud Tombstone to prevent the profile from reappearing on customer screens.
            </p>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleConfirmDeleteExpert}
                disabled={deletingExpert}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-black text-xs rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-rose-600/20"
              >
                <Trash2 className="w-4 h-4" />
                <span>{deletingExpert ? 'Deleting & Syncing...' : 'Yes, Delete Expert'}</span>
              </button>
              <button
                onClick={() => setExpertToDelete(null)}
                disabled={deletingExpert}
                className="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Add / Edit Verified Expert */}
      {editingExpert && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 max-w-2xl w-full my-8 shadow-2xl relative space-y-5 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => { setEditingExpert(null); setIsCreatingExpert(false); }}
              className="absolute top-6 right-6 p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-cyan-400 font-bold uppercase tracking-wider">
                  {isCreatingExpert ? 'New Specialist Registration' : 'Edit Specialist Profile'}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  Cloud Sync
                </span>
              </div>
              <h2 className="text-xl font-black text-white mt-1">
                {isCreatingExpert ? 'Add Verified Expert' : `Edit: ${editingExpert.name}`}
              </h2>
              <p className="text-xs text-slate-400">
                Configure verified credentials, project availability, and technical domains.
              </p>
            </div>

            <div className="space-y-4 text-xs">
              {/* Basic Details: Name and Professional Title */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Full Name *</label>
                  <input
                    type="text"
                    value={editingExpert.name || ''}
                    onChange={(e) => setEditingExpert({ ...editingExpert, name: e.target.value, professionalName: e.target.value })}
                    placeholder="e.g. Tunde Adeyemi"
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Professional Title *</label>
                  <input
                    type="text"
                    value={editingExpert.title || ''}
                    onChange={(e) => setEditingExpert({ ...editingExpert, title: e.target.value })}
                    placeholder="e.g. Lead AI Systems Architect"
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Specialization & Experience */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-slate-300 font-bold mb-1">Specialization Domain *</label>
                  <input
                    type="text"
                    value={editingExpert.specialization || ''}
                    onChange={(e) => setEditingExpert({ 
                      ...editingExpert, 
                      specialization: e.target.value,
                      primaryExpertise: e.target.value 
                    })}
                    placeholder="e.g. Full-Stack Software Engineering, Cloud Architecture"
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Years of Experience</label>
                  <input
                    type="number"
                    min="1"
                    max="35"
                    value={editingExpert.experienceYears || 5}
                    onChange={(e) => setEditingExpert({ ...editingExpert, experienceYears: parseInt(e.target.value) || 1 })}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Contact Info: Email & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Email Address</label>
                  <input
                    type="email"
                    value={editingExpert.email || ''}
                    onChange={(e) => setEditingExpert({ ...editingExpert, email: e.target.value })}
                    placeholder="expert@nexovira.com"
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={editingExpert.phone || ''}
                    onChange={(e) => setEditingExpert({ ...editingExpert, phone: e.target.value })}
                    placeholder="+234 802 000 1122"
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Location & Avatar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Location / Base</label>
                  <input
                    type="text"
                    value={editingExpert.location || ''}
                    onChange={(e) => setEditingExpert({ ...editingExpert, location: e.target.value })}
                    placeholder="e.g. Lagos, Nigeria or Remote"
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <ImageUploadField
                    value={editingExpert.avatarUrl || ''}
                    onChange={(url) => setEditingExpert({ ...editingExpert, avatarUrl: url })}
                    label="Avatar / Headshot Photo"
                    helperText="Upload expert portrait photo (square 1:1). JPG, PNG, WebP."
                    folder="service_providers/avatars"
                    aspectRatio="square"
                    required
                  />
                </div>
              </div>

              {/* Quick Avatar Presets */}
              <div>
                <label className="block text-slate-400 text-[11px] mb-1.5">Quick Avatar Presets:</label>
                <div className="flex gap-2 flex-wrap">
                  {[
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
                    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
                    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80',
                    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
                    'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&auto=format&fit=crop&q=80'
                  ].map((url, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setEditingExpert({ ...editingExpert, avatarUrl: url })}
                      className={`w-9 h-9 rounded-xl overflow-hidden border-2 transition-all ${
                        editingExpert.avatarUrl === url ? 'border-cyan-400 scale-105' : 'border-slate-800 hover:border-slate-600'
                      }`}
                    >
                      <img src={url} alt="Preset" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Skills (comma-separated) */}
              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  Skills & Technologies (comma separated)
                </label>
                <input
                  type="text"
                  value={Array.isArray(editingExpert.skills) ? editingExpert.skills.join(', ') : ''}
                  onChange={(e) => setEditingExpert({ 
                    ...editingExpert, 
                    skills: e.target.value.split(',').map(s => s.trim()).filter(Boolean) 
                  })}
                  placeholder="e.g. React, TypeScript, Node.js, Next.js, Kubernetes, PostgreSQL"
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-cyan-500"
                />
                {editingExpert.skills && editingExpert.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {editingExpert.skills.map((s, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-slate-800 text-cyan-400 text-[10px]">
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Bio */}
              <div>
                <label className="block text-slate-300 font-bold mb-1">Professional Bio & Experience Summary</label>
                <textarea
                  rows={3}
                  value={editingExpert.bio || ''}
                  onChange={(e) => setEditingExpert({ 
                    ...editingExpert, 
                    bio: e.target.value,
                    experienceSummary: e.target.value 
                  })}
                  placeholder="Detailed background on technical accomplishments, previous systems built, and advisory capabilities..."
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-cyan-500 resize-none leading-relaxed"
                />
              </div>

              {/* Portfolio & Social Links */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 text-[11px] mb-1">GitHub URL</label>
                  <input
                    type="text"
                    value={editingExpert.githubUrl || ''}
                    onChange={(e) => setEditingExpert({ ...editingExpert, githubUrl: e.target.value })}
                    placeholder="https://github.com/username"
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-cyan-500 text-[11px]"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 text-[11px] mb-1">LinkedIn URL</label>
                  <input
                    type="text"
                    value={editingExpert.linkedInUrl || ''}
                    onChange={(e) => setEditingExpert({ ...editingExpert, linkedInUrl: e.target.value })}
                    placeholder="https://linkedin.com/in/username"
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-cyan-500 text-[11px]"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 text-[11px] mb-1">Portfolio / Website</label>
                  <input
                    type="text"
                    value={editingExpert.websiteUrl || ''}
                    onChange={(e) => setEditingExpert({ ...editingExpert, websiteUrl: e.target.value })}
                    placeholder="https://portfolio.dev"
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-cyan-500 text-[11px]"
                  />
                </div>
              </div>

              {/* Status and Verification Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-950 rounded-2xl border border-slate-800">
                <div>
                  <label className="block text-slate-400 text-[11px] mb-1">Application Status</label>
                  <select
                    value={editingExpert.applicationStatus || 'Approved'}
                    onChange={(e) => setEditingExpert({ 
                      ...editingExpert, 
                      applicationStatus: e.target.value as ExpertApplicationStatus,
                      isPublic: e.target.value === 'Approved'
                    })}
                    className="w-full p-2 bg-slate-900 border border-slate-800 rounded-xl text-white outline-none focus:border-cyan-500"
                  >
                    <option value="Approved">Approved (Public)</option>
                    <option value="Under Review">Under Review</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 text-[11px] mb-1">Availability</label>
                  <select
                    value={editingExpert.availability || 'available'}
                    onChange={(e) => setEditingExpert({ 
                      ...editingExpert, 
                      availability: e.target.value as 'available' | 'busy' | 'part_time' 
                    })}
                    className="w-full p-2 bg-slate-900 border border-slate-800 rounded-xl text-white outline-none focus:border-cyan-500"
                  >
                    <option value="available">Available Now</option>
                    <option value="part_time">Part-Time</option>
                    <option value="busy">Busy / On Project</option>
                  </select>
                </div>

                <div className="flex items-center justify-between sm:justify-center sm:flex-col sm:items-start pt-1">
                  <label className="text-slate-400 text-[11px] mb-1">Verified Status</label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingExpert.verifiedByManagement !== false}
                      onChange={(e) => setEditingExpert({ ...editingExpert, verifiedByManagement: e.target.checked })}
                      className="w-4 h-4 rounded text-cyan-500 bg-slate-900 border-slate-700"
                    />
                    <span className="text-cyan-400 font-bold text-xs flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Verified
                    </span>
                  </label>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-3">
                <button
                  onClick={() => handleSaveExpert(editingExpert)}
                  disabled={expertSaving || !editingExpert.name?.trim() || !editingExpert.title?.trim()}
                  className="flex-1 py-3 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-black rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20"
                >
                  <Save className="w-4 h-4" />
                  <span>{expertSaving ? 'Saving & Syncing...' : isCreatingExpert ? 'Create & Sync Expert' : 'Save & Sync Changes'}</span>
                </button>
                <button
                  onClick={() => { setEditingExpert(null); setIsCreatingExpert(false); }}
                  className="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Category Deletion Modal */}
      {categoryToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1.5">
              <h3 className="text-lg font-bold text-white">Delete Category?</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Are you sure you want to permanently delete category <strong className="text-white">"{categoryToDelete.title}"</strong>? This will remove it from the ecosystem and sync globally across Cloud Firestore.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCategoryToDelete(null)}
                disabled={deletingCategory}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteCategory}
                disabled={deletingCategory}
                className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-lg shadow-rose-500/20"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{deletingCategory ? 'Deleting & Syncing...' : 'Yes, Delete Category'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Service Request (Brief) Deletion Modal */}
      {requestToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1.5">
              <h3 className="text-lg font-bold text-white">Delete Service Brief?</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Permanently delete service brief <strong className="text-cyan-400">{requestToDelete.referenceNumber}</strong> ({requestToDelete.serviceTitle})? This action records a tombstone in Cloud Sync so it does not reappear.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRequestToDelete(null)}
                disabled={deletingRequest}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteRequest}
                disabled={deletingRequest}
                className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-lg shadow-rose-500/20"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{deletingRequest ? 'Deleting...' : 'Delete Brief'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear All Mock Briefs Modal */}
      {showClearAllRequestsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1.5">
              <h3 className="text-lg font-bold text-white">Clear All Service Briefs?</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                This will delete all <strong className="text-white">{requests.length}</strong> service briefs (including all mock sample requests) from Cloud Firestore and sync the clean state across all devices.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowClearAllRequestsModal(false)}
                disabled={clearingAllRequests}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearAllRequests}
                disabled={clearingAllRequests}
                className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-lg shadow-rose-500/20"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{clearingAllRequests ? 'Clearing All...' : 'Clear All Mock Briefs'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
