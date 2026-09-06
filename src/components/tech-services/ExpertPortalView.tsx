import React, { useState, useEffect } from 'react';
import { 
  Briefcase, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  DollarSign, 
  FileText, 
  RefreshCw, 
  ShieldCheck, 
  ChevronRight, 
  Send,
  X,
  UserCheck,
  Building2,
  Calendar
} from 'lucide-react';
import { 
  getServiceRequestsFromFirestore, 
  providerRespondToRequestInFirestore,
  updateServiceRequestStatusInFirestore
} from '../../lib/firestoreService';
import { ServiceRequest } from '../../types';

interface ExpertPortalViewProps {
  currentExpertName?: string;
  onApplyNew?: () => void;
}

export const ExpertPortalView: React.FC<ExpertPortalViewProps> = ({
  currentExpertName = 'Verified Technical Specialist',
  onApplyNew
}) => {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [availability, setAvailability] = useState<'available' | 'part_time' | 'busy'>('available');
  const [selectedAssignment, setSelectedAssignment] = useState<ServiceRequest | null>(null);
  const [responseNotes, setResponseNotes] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string>('');

  const loadAssignments = async () => {
    setLoading(true);
    try {
      const all = await getServiceRequestsFromFirestore();
      setRequests(all);
    } catch (err) {
      console.warn('Failed to load expert assignments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssignments();
  }, []);

  // Filter for pending offers / active projects
  const pendingAssignments = requests.filter(r => 
    r.status === 'Assigned' || r.status === 'Expert Assigned' || r.status === 'Submitted'
  );
  const activeProjects = requests.filter(r => 
    r.status === 'Project In Progress' || r.status === 'Accepted'
  );
  const completedProjects = requests.filter(r => r.status === 'Completed');

  const handleRespond = async (accepted: boolean) => {
    if (!selectedAssignment) return;
    setActionLoading(true);
    try {
      await providerRespondToRequestInFirestore(
        selectedAssignment.id,
        accepted,
        responseNotes || (accepted ? 'Expert accepted assignment and will commence onboarding.' : 'Expert currently unavailable for this specific scope.')
      );
      setActionSuccessMsg(accepted ? 'Assignment successfully accepted! Added to Active Projects.' : 'Assignment declined.');
      await loadAssignments();
      setTimeout(() => {
        setSelectedAssignment(null);
        setActionSuccessMsg('');
        setResponseNotes('');
      }, 1500);
    } catch (err: any) {
      alert('Error updating response: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateMilestone = async (reqId: string, newStatus: any, notes: string) => {
    try {
      await updateServiceRequestStatusInFirestore(reqId, newStatus, notes);
      await loadAssignments();
      alert('Milestone progress updated for Nexovira QA review.');
    } catch (err: any) {
      alert('Failed to update milestone: ' + err.message);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider bg-cyan-500/10 px-2.5 py-0.5 rounded-full border border-cyan-500/20">
              Nexovira Specialist Workspace
            </span>
            <span className="text-xs text-emerald-400 flex items-center gap-1 font-bold">
              <ShieldCheck className="w-3.5 h-3.5" />
              Verified Talent
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white">{currentExpertName}</h2>
          <p className="text-xs text-slate-400">
            Managed project briefs, milestone submissions, and escrow payout status.
          </p>
        </div>

        {/* Availability Toggle */}
        <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-2xl border border-slate-800">
          <span className="text-xs text-slate-400 font-bold px-2">Status:</span>
          {(['available', 'part_time', 'busy'] as const).map(st => (
            <button
              key={st}
              onClick={() => setAvailability(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                availability === st
                  ? 'bg-cyan-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {st === 'available' && 'Available'}
              {st === 'part_time' && 'Part-Time'}
              {st === 'busy' && 'Busy'}
            </button>
          ))}
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Pending Briefs</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-black text-white">{pendingAssignments.length}</p>
          <span className="text-[11px] text-amber-400">Awaiting your response</span>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Active Projects</span>
            <Briefcase className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-2xl font-black text-white">{activeProjects.length}</p>
          <span className="text-[11px] text-cyan-400">In execution</span>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Completed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-white">{completedProjects.length}</p>
          <span className="text-[11px] text-emerald-400">Approved deliverables</span>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Managed Escrow</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-400 font-mono">₦1.85M</p>
          <span className="text-[10px] text-slate-500">Secured via Nexovira</span>
        </div>
      </div>

      {/* Managed Payment Notice */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-start gap-3.5 text-xs text-slate-300">
        <Building2 className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <h4 className="font-bold text-white">Nexovira Managed Payment Architecture</h4>
          <p className="text-slate-400 leading-relaxed">
            Client funds are held securely in Nexovira Project Escrow prior to project commencement. Payouts are automatically authorized directly to your verified bank account upon deliverable milestone approval by Nexovira administration.
          </p>
        </div>
      </div>

      {/* Pending Assignments Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <span>Project Briefs Assigned to You ({pendingAssignments.length})</span>
          </h3>
          <button
            onClick={loadAssignments}
            className="text-xs text-slate-400 hover:text-cyan-400 flex items-center gap-1"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {pendingAssignments.length === 0 ? (
          <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-500 text-xs">
            No pending project briefs at this time. Nexovira administration assigns new projects as briefs are matched.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingAssignments.map(req => (
              <div
                key={req.id}
                className="bg-slate-900 border border-slate-800 hover:border-cyan-500/50 rounded-2xl p-5 space-y-4 transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[11px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                      {req.referenceNumber}
                    </span>
                    <h4 className="font-bold text-white text-sm mt-1">{req.serviceTitle}</h4>
                    <span className="text-xs text-slate-400">{req.serviceCategory}</span>
                  </div>

                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    Awaiting Acceptance
                  </span>
                </div>

                <p className="text-xs text-slate-300 line-clamp-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
                  {req.projectDescription}
                </p>

                <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
                  <span>Budget: <strong className="text-white font-mono">{req.budgetExpectation}</strong></span>
                  <span>Timeline: <strong className="text-white">{req.timeline}</strong></span>
                </div>

                <button
                  onClick={() => setSelectedAssignment(req)}
                  className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs rounded-xl shadow transition-all flex items-center justify-center gap-1.5"
                >
                  <span>Review Brief & Respond</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active Projects Execution Section */}
      <div className="space-y-4 pt-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-cyan-400" />
          <span>Active Projects Under Execution ({activeProjects.length})</span>
        </h3>

        {activeProjects.length === 0 ? (
          <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-500 text-xs">
            No projects currently in progress.
          </div>
        ) : (
          <div className="space-y-3">
            {activeProjects.map(proj => (
              <div key={proj.id} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-cyan-400 font-bold">{proj.referenceNumber}</span>
                    <span className="text-xs text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      In Execution
                    </span>
                  </div>
                  <h4 className="font-bold text-white text-sm">{proj.serviceTitle}</h4>
                  <p className="text-xs text-slate-400">Client: {proj.customerName} • Budget: {proj.budgetExpectation}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleUpdateMilestone(proj.id, 'Client Review', 'Milestone completed and submitted for client and QA review.')}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-cyan-400 rounded-xl transition-colors"
                  >
                    Submit Milestone for Review
                  </button>
                  <button
                    onClick={() => handleUpdateMilestone(proj.id, 'Completed', 'Final deliverables approved and verified.')}
                    className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-xs font-bold text-emerald-300 rounded-xl transition-colors"
                  >
                    Mark Complete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Review Brief & Respond Modal */}
      {selectedAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-fadeIn">
          <div 
            className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl my-8 text-white max-h-[90vh] overflow-y-auto space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedAssignment(null)}
              className="absolute top-6 right-6 p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="text-xs font-mono text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded border border-cyan-500/20 font-bold">
                {selectedAssignment.referenceNumber}
              </span>
              <h2 className="text-2xl font-black text-white mt-2">{selectedAssignment.serviceTitle}</h2>
              <p className="text-xs text-slate-400 mt-0.5">Category: {selectedAssignment.serviceCategory}</p>
            </div>

            {/* Assignment Notes from Admin */}
            <div className="p-4 rounded-2xl bg-cyan-950/30 border border-cyan-500/30 text-xs text-slate-300 space-y-1">
              <strong className="text-cyan-400 font-bold block">Nexovira Admin Assignment Note:</strong>
              <p>{selectedAssignment.assignmentNotes || selectedAssignment.managementNotes || 'Assigned to your profile based on relevant expertise and verified competencies.'}</p>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Project Description</h4>
              <p className="text-xs sm:text-sm text-slate-300 bg-slate-950 p-4 rounded-xl leading-relaxed whitespace-pre-line border border-slate-800">
                {selectedAssignment.projectDescription}
              </p>
            </div>

            {/* Specs */}
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-slate-500 block">Client Budget:</span>
                <strong className="text-white font-mono mt-0.5 block">{selectedAssignment.budgetExpectation}</strong>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-slate-500 block">Target Timeline:</span>
                <strong className="text-white mt-0.5 block">{selectedAssignment.timeline}</strong>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-slate-500 block">Scope Level:</span>
                <strong className="text-white mt-0.5 block">{selectedAssignment.projectScope || 'Standard'}</strong>
              </div>
            </div>

            {/* Response Notes Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">
                Notes for Nexovira Administration (Optional):
              </label>
              <textarea
                rows={2}
                value={responseNotes}
                onChange={(e) => setResponseNotes(e.target.value)}
                placeholder="Clarifications regarding timeline, scope milestones, or kickoff requirements..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-cyan-500 resize-none"
              />
            </div>

            {actionSuccessMsg && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                {actionSuccessMsg}
              </div>
            )}

            {/* Actions */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleRespond(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-400 font-bold text-xs transition-colors"
              >
                Decline Assignment
              </button>

              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleRespond(true)}
                className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all flex items-center gap-1.5"
              >
                {actionLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Accept Assignment</span>
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
