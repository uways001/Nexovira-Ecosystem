import React, { useState } from 'react';
import { 
  X, 
  Search, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  UserCheck, 
  FileText, 
  Sparkles,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { ServiceRequest, ServiceRequestStatus } from '../types';
import { getServiceRequestByRefFromFirestore } from '../lib/firestoreService';

interface ServiceRequestTrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialRef?: string;
}

const STATUS_STEPS: { status: ServiceRequestStatus; label: string; desc: string }[] = [
  { status: 'Submitted', label: 'Brief Submitted', desc: 'Project specifications received by Nexovira' },
  { status: 'Under Review', label: 'Management Review', desc: 'Scope verification & specialist matching' },
  { status: 'Assigned', label: 'Specialist Assigned', desc: 'Matched with an approved specialist in Nigeria' },
  { status: 'Accepted', label: 'Terms Accepted', desc: 'Provider confirmed timeline & milestone terms' },
  { status: 'In Progress', label: 'In Execution', desc: 'Active development under milestone protection' },
  { status: 'Completed', label: 'Delivered & Completed', desc: 'Final deliverables approved' }
];

export const ServiceRequestTrackerModal: React.FC<ServiceRequestTrackerModalProps> = ({
  isOpen,
  onClose,
  initialRef = '',
}) => {
  const [referenceQuery, setReferenceQuery] = useState(initialRef);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState('');
  const [foundRequest, setFoundRequest] = useState<ServiceRequest | null>(null);

  if (!isOpen) return null;

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!referenceQuery.trim()) {
      setError('Please enter a reference number.');
      return;
    }

    setIsSearching(true);
    setError('');
    try {
      const request = await getServiceRequestByRefFromFirestore(referenceQuery.trim());
      if (request) {
        setFoundRequest(request);
      } else {
        setError(`No project brief found for reference "${referenceQuery.trim()}". Please verify your reference ID.`);
        setFoundRequest(null);
      }
    } catch (err: any) {
      setError('Unable to fetch request details. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const getStepIndex = (status: ServiceRequestStatus) => {
    if (status === 'Declined') return -1;
    return STATUS_STEPS.findIndex((s) => s.status === status);
  };

  const currentStepIdx = foundRequest ? getStepIndex(foundRequest.status) : 0;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl text-left relative my-8 overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-6 bg-gradient-to-r from-blue-900 via-slate-900 to-slate-950 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold border border-blue-500/30 mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Real-Time Request Tracking</span>
          </div>

          <h3 className="text-xl font-black text-white">
            Track Your Service Request
          </h3>
          <p className="text-xs text-blue-200/90 mt-1">
            Check the status of your project brief, management review, and assigned expert in Nigeria.
          </p>
        </div>

        {/* Tracker Body */}
        <div className="p-6 space-y-6">
          {/* Reference Search Input */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={referenceQuery}
                onChange={(e) => setReferenceQuery(e.target.value)}
                placeholder="Enter reference number (e.g. NEX-SR-2026-4821)"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-mono uppercase"
              />
            </div>
            <button
              type="submit"
              disabled={isSearching}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-colors disabled:opacity-50"
            >
              {isSearching ? 'Searching...' : 'Track'}
            </button>
          </form>

          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-500 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Result Card */}
          {foundRequest && (
            <div className="space-y-6 animate-fadeIn">
              {/* Top Summary Banner */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                      {foundRequest.referenceNumber}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      • {new Date(foundRequest.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
                    {foundRequest.serviceTitle}
                  </h4>
                  <p className="text-xs text-slate-500">
                    Client: {foundRequest.customerName} ({foundRequest.customerLocation || 'Nigeria'})
                  </p>
                </div>

                <div className="text-right">
                  <span
                    className={`inline-block px-3 py-1 rounded-xl text-xs font-bold border ${
                      foundRequest.status === 'Completed'
                        ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                        : foundRequest.status === 'Declined'
                        ? 'bg-rose-500/10 text-rose-600 border-rose-500/30'
                        : 'bg-blue-500/10 text-blue-600 border-blue-500/30'
                    }`}
                  >
                    {foundRequest.status}
                  </span>
                </div>
              </div>

              {/* Status Timeline */}
              {foundRequest.status === 'Declined' ? (
                <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-xs text-rose-800 dark:text-rose-300 space-y-1">
                  <span className="font-bold">Project Declined / Scope Closed</span>
                  <p className="text-[11px] leading-relaxed">
                    {foundRequest.managementNotes || 'Our management team was unable to accommodate the requested specifications or timeline. Please contact support to submit an updated brief.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Workflow Progress
                  </h5>
                  <div className="relative pl-6 space-y-5 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                    {STATUS_STEPS.map((step, idx) => {
                      const isDone = currentStepIdx > idx;
                      const isCurrent = currentStepIdx === idx;

                      return (
                        <div key={step.status} className="relative flex items-start gap-3">
                          <div
                            className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center border text-[10px] font-bold ${
                              isDone
                                ? 'bg-emerald-500 text-white border-emerald-500'
                                : isCurrent
                                ? 'bg-blue-600 text-white border-blue-600 ring-4 ring-blue-500/20'
                                : 'bg-white dark:bg-slate-900 text-slate-400 border-slate-300 dark:border-slate-700'
                            }`}
                          >
                            {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : idx + 1}
                          </div>
                          <div>
                            <p
                              className={`text-xs font-bold ${
                                isCurrent
                                  ? 'text-blue-600 dark:text-blue-400'
                                  : isDone
                                  ? 'text-slate-900 dark:text-white'
                                  : 'text-slate-400'
                              }`}
                            >
                              {step.label}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              {step.desc}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Assignment Information */}
              {foundRequest.assignedProviderName && (
                <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-slate-950 border border-blue-200 dark:border-blue-900/40 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-blue-700 dark:text-blue-300">
                    <UserCheck className="w-4 h-4 text-blue-500" />
                    <span>Assigned Specialist in Nigeria:</span>
                  </div>
                  <p className="text-xs font-extrabold text-slate-900 dark:text-white pl-5">
                    {foundRequest.assignedProviderName}
                  </p>
                  {foundRequest.assignmentNotes && (
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 pl-5">
                      Management Notes: {foundRequest.assignmentNotes}
                    </p>
                  )}
                </div>
              )}

              {/* Project Brief Details */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-300">Project Description:</span>
                <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed whitespace-pre-wrap">
                  {foundRequest.projectDescription}
                </p>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px]">
                  <div>
                    <span className="text-slate-500">Target Budget:</span>{' '}
                    <span className="font-bold text-slate-800 dark:text-slate-200">{foundRequest.budgetExpectation}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Timeline:</span>{' '}
                    <span className="font-bold text-slate-800 dark:text-slate-200">{foundRequest.timeline}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-500 text-[11px]">Need urgent assistance? Contact management at services@nexovira.com</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
