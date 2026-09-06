import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ExternalLink, 
  RefreshCw, 
  Layers, 
  FileText, 
  Plus, 
  Search,
  Filter,
  X,
  UserCheck,
  ShieldCheck,
  MessageSquare
} from 'lucide-react';
import { getServiceRequestsFromFirestore } from '../../lib/firestoreService';
import { ServiceRequest, ServiceRequestStatus } from '../../types';

interface CustomerRequestsDashboardProps {
  userEmail?: string;
  onNewRequest: () => void;
}

const STATUS_ORDER: ServiceRequestStatus[] = [
  'Submitted',
  'Under Review',
  'Expertise Matching',
  'Expert Assigned',
  'Project In Progress',
  'Client Review',
  'Completed'
];

export const CustomerRequestsDashboard: React.FC<CustomerRequestsDashboardProps> = ({
  userEmail,
  onNewRequest
}) => {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const data = await getServiceRequestsFromFirestore();
      // If userEmail is available, prioritize their requests or show all for preview
      if (userEmail) {
        const userSpecific = data.filter(r => r.customerEmail.toLowerCase() === userEmail.toLowerCase());
        setRequests(userSpecific.length > 0 ? userSpecific : data);
      } else {
        setRequests(data);
      }
    } catch (err) {
      console.warn('Failed to load customer requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [userEmail]);

  const filtered = requests.filter(req => {
    const matchesFilter = filterStatus === 'all' || req.status === filterStatus;
    const matchesSearch = !searchQuery.trim() || 
      req.referenceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.serviceTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.serviceCategory.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getStatusBadge = (status: ServiceRequestStatus) => {
    switch (status) {
      case 'Submitted':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'Under Review':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'Awaiting Information':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/30';
      case 'Expertise Matching':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      case 'Expert Assigned':
      case 'Assigned':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
      case 'Project In Progress':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'Client Review':
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30';
      case 'Completed':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'Cancelled':
      case 'Declined':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-3xl">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs uppercase tracking-wider">
            <Layers className="w-4 h-4" />
            <span>Centralized Project Tracking</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white mt-1">My Service Requests</h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time status updates, milestone progress, and coordination notes from Nexovira management.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={fetchRequests}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Refresh requests"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>

          <button
            onClick={onNewRequest}
            className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Submit New Project</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-slate-900/60 border border-slate-800 p-3 rounded-2xl">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by request ID, title, or category..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <Filter className="w-3.5 h-3.5 text-slate-500 shrink-0 hidden sm:block" />
          {['all', 'Submitted', 'Under Review', 'Expert Assigned', 'Project In Progress', 'Completed'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                filterStatus === st
                  ? 'bg-cyan-500 text-slate-950'
                  : 'bg-slate-950 text-slate-400 border border-slate-800 hover:border-slate-700'
              }`}
            >
              {st === 'all' ? 'All Requests' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Requests List */}
      {loading ? (
        <div className="p-16 text-center text-slate-400 bg-slate-900 border border-slate-800 rounded-3xl space-y-3">
          <RefreshCw className="w-6 h-6 animate-spin text-cyan-400 mx-auto" />
          <p className="text-xs">Fetching your active briefs from Firestore...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center text-slate-400 bg-slate-900 border border-slate-800 rounded-3xl space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
            <FileText className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white">No service requests found</h3>
            <p className="text-xs text-slate-500">
              {searchQuery ? 'Try adjusting your search criteria.' : "You haven't submitted any technical briefs yet."}
            </p>
          </div>
          <button
            onClick={onNewRequest}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-bold rounded-xl"
          >
            Submit a Project Brief
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((req) => {
            const currentStatusIndex = STATUS_ORDER.indexOf(req.status);
            const statusIdx = currentStatusIndex >= 0 ? currentStatusIndex : 0;

            return (
              <div
                key={req.id}
                onClick={() => setSelectedRequest(req)}
                className="bg-slate-900 border border-slate-800 hover:border-cyan-500/50 rounded-2xl p-5 sm:p-6 transition-all cursor-pointer shadow-lg space-y-5"
              >
                {/* Top Row: Ref & Status */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded-md border border-cyan-500/20">
                        {req.referenceNumber}
                      </span>
                      <span className="text-xs text-slate-500">•</span>
                      <span className="text-xs font-bold text-slate-300">{req.serviceCategory}</span>
                    </div>
                    <h3 className="text-base font-black text-white mt-1.5">{req.serviceTitle}</h3>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-center">
                    <span className={`text-xs font-bold px-3 py-1 rounded-full border ${getStatusBadge(req.status)}`}>
                      {req.status}
                    </span>
                  </div>
                </div>

                {/* Progress Pipeline */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold">
                    <span>Progress Roadmap</span>
                    <span className="text-cyan-400 font-mono">
                      Step {statusIdx + 1} of {STATUS_ORDER.length}
                    </span>
                  </div>
                  <div className="grid grid-cols-7 gap-1.5">
                    {STATUS_ORDER.map((stage, idx) => {
                      const isPastOrCurrent = idx <= statusIdx;
                      return (
                        <div
                          key={stage}
                          title={stage}
                          className={`h-1.5 rounded-full transition-all ${
                            isPastOrCurrent 
                              ? 'bg-gradient-to-r from-cyan-500 to-blue-500' 
                              : 'bg-slate-800'
                          }`}
                        />
                      );
                    })}
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500 font-medium pt-0.5">
                    <span>Submitted</span>
                    <span className="hidden sm:inline">Under Review</span>
                    <span className="hidden sm:inline">Matching</span>
                    <span>Assigned</span>
                    <span className="hidden sm:inline">In Progress</span>
                    <span>Completed</span>
                  </div>
                </div>

                {/* Meta details */}
                <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
                  <div className="flex items-center gap-4">
                    <span>Budget: <strong className="text-slate-200">{req.budgetExpectation}</strong></span>
                    <span>•</span>
                    <span>Timeline: <strong className="text-slate-200">{req.timeline}</strong></span>
                    {req.assignedProviderName && (
                      <>
                        <span>•</span>
                        <span className="text-cyan-400 flex items-center gap-1 font-bold">
                          <UserCheck className="w-3.5 h-3.5" />
                          Specialist: {req.assignedProviderName}
                        </span>
                      </>
                    )}
                  </div>

                  <span className="text-slate-500 text-[11px]">
                    Submitted: {new Date(req.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Project Details Modal / Drawer */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-fadeIn">
          <div 
            className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl my-8 text-white max-h-[90vh] overflow-y-auto space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setSelectedRequest(null)}
              className="absolute top-6 right-6 p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded-md border border-cyan-500/20">
                  {selectedRequest.referenceNumber}
                </span>
                <span className={`text-xs font-bold px-3 py-0.5 rounded-full border ${getStatusBadge(selectedRequest.status)}`}>
                  {selectedRequest.status}
                </span>
              </div>
              <h2 className="text-2xl font-black text-white mt-2">{selectedRequest.serviceTitle}</h2>
              <p className="text-xs text-slate-400 mt-1">Category: {selectedRequest.serviceCategory}</p>
            </div>

            {/* Management Updates Banner */}
            <div className="p-4 rounded-2xl bg-cyan-950/30 border border-cyan-500/30 space-y-1">
              <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs">
                <ShieldCheck className="w-4 h-4" />
                <span>Nexovira Management Coordination Note:</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {selectedRequest.managementNotes || 'Your brief is currently in active review by our engineering talent coordinator.'}
              </p>
            </div>

            {/* Assigned Specialist */}
            {selectedRequest.assignedProviderName && (
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block">Assigned Technical Specialist</span>
                    <strong className="text-sm font-bold text-white">{selectedRequest.assignedProviderName}</strong>
                  </div>
                </div>
                <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full font-bold">
                  Active Coordinator
                </span>
              </div>
            )}

            {/* Brief Description */}
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Project Description</h4>
              <p className="text-xs sm:text-sm text-slate-300 bg-slate-950 p-4 rounded-xl leading-relaxed whitespace-pre-line border border-slate-800">
                {selectedRequest.projectDescription}
              </p>
            </div>

            {/* Specifications Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                <span className="text-slate-500 block">Budget:</span>
                <strong className="text-white font-mono mt-0.5 block">{selectedRequest.budgetExpectation}</strong>
              </div>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                <span className="text-slate-500 block">Timeline:</span>
                <strong className="text-white mt-0.5 block">{selectedRequest.timeline}</strong>
              </div>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                <span className="text-slate-500 block">Project Scope:</span>
                <strong className="text-white mt-0.5 block">{selectedRequest.projectScope || 'Standard'}</strong>
              </div>
            </div>

            {/* Required Skills */}
            {selectedRequest.requiredExpertise && selectedRequest.requiredExpertise.length > 0 && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Required Skills</h4>
                <div className="flex flex-wrap gap-1.5">
                  {selectedRequest.requiredExpertise.map((sk, i) => (
                    <span key={i} className="text-[11px] bg-slate-950 text-cyan-400 border border-slate-800 px-2.5 py-1 rounded-lg">
                      {sk}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Client Info */}
            <div className="pt-4 border-t border-slate-800 flex justify-between text-xs text-slate-500">
              <span>Submitted by: <strong className="text-slate-300">{selectedRequest.customerName}</strong> ({selectedRequest.customerEmail})</span>
              <span>Logged: {new Date(selectedRequest.createdAt).toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
