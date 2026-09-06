import React, { useState } from 'react';
import { 
  X, 
  Send, 
  CheckCircle2, 
  UploadCloud, 
  FileText, 
  Clock, 
  DollarSign, 
  ShieldCheck, 
  AlertCircle, 
  Link as LinkIcon,
  Sparkles,
  MapPin,
  Phone,
  Mail,
  User,
  ExternalLink
} from 'lucide-react';
import { TechService, ServiceProvider, ServiceRequest } from '../types';
import { submitServiceRequestToFirestore } from '../lib/firestoreService';
import { compressImageFile } from '../lib/imageUtils';

interface ServiceRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedService?: TechService | null;
  selectedProvider?: ServiceProvider | null;
  onSuccess?: (request: ServiceRequest) => void;
}

export const ServiceRequestModal: React.FC<ServiceRequestModalProps> = ({
  isOpen,
  onClose,
  selectedService,
  selectedProvider,
  onSuccess,
}) => {
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerLocation, setCustomerLocation] = useState('Lagos, Nigeria');
  const [serviceTitle, setServiceTitle] = useState(
    selectedService ? selectedService.title : selectedProvider ? `Custom Project for ${selectedProvider.name}` : ''
  );
  const [serviceCategory, setServiceCategory] = useState(
    selectedService?.category || selectedProvider?.specialization || 'Technology Services'
  );
  const [projectDescription, setProjectDescription] = useState('');
  const [budgetExpectation, setBudgetExpectation] = useState(
    selectedService?.startingPriceNGN ? `₦${selectedService.startingPriceNGN.toLocaleString()}` : '₦100,000 - ₦250,000'
  );
  const [budgetCurrency, setBudgetCurrency] = useState<'NGN' | 'USD'>('NGN');
  const [timeline, setTimeline] = useState('1 - 2 weeks');
  const [linksInput, setLinksInput] = useState('');
  const [attachments, setAttachments] = useState<{ name: string; url: string; size?: string }[]>([]);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [submittedRequest, setSubmittedRequest] = useState<ServiceRequest | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage('File too large. Maximum size is 10MB.');
      return;
    }

    setIsUploadingAttachment(true);
    setErrorMessage('');
    try {
      let fileUrl = '';
      if (file.type.startsWith('image/')) {
        fileUrl = await compressImageFile(file, 1600, 1600, 0.85);
      } else {
        // Read as base64 for document previews
        const reader = new FileReader();
        fileUrl = await new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error('Failed to read file.'));
          reader.readAsDataURL(file);
        });
      }

      setAttachments((prev) => [
        ...prev,
        {
          name: file.name,
          url: fileUrl,
          size: (file.size / 1024).toFixed(1) + ' KB'
        }
      ]);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error processing attachment.');
    } finally {
      setIsUploadingAttachment(false);
    }
  };

  const handleRemoveAttachment = (idx: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!customerName.trim() || !customerEmail.trim() || !projectDescription.trim()) {
      setErrorMessage('Please complete all required fields (Name, Email, and Project Description).');
      return;
    }

    const referenceLinks = linksInput
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    setIsSubmitting(true);
    try {
      const created = await submitServiceRequestToFirestore({
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim(),
        customerPhone: customerPhone.trim(),
        customerLocation: customerLocation.trim(),
        country: 'Nigeria',
        countryCode: 'NG',
        serviceId: selectedService?.id || '',
        serviceTitle: serviceTitle.trim() || 'Custom Nigeria Service Request',
        serviceCategory: serviceCategory,
        projectDescription: projectDescription.trim(),
        budgetExpectation: budgetExpectation.trim(),
        budgetCurrency,
        timeline,
        referenceLinks,
        attachments,
        assignedProviderId: selectedProvider ? selectedProvider.id : null,
        assignedProviderName: selectedProvider ? selectedProvider.name : null,
        assignmentNotes: selectedProvider ? `Preferred expert selected by customer: ${selectedProvider.name}` : null
      });

      setSubmittedRequest(created);
      if (onSuccess) {
        onSuccess(created);
      }
    } catch (err: any) {
      console.error('Failed to submit service request:', err);
      setErrorMessage(err.message || 'Failed to submit request. Please try again or contact management.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl text-left relative my-8 overflow-hidden">
        
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-blue-900 via-slate-900 to-slate-950 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold border border-blue-500/30 mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Nexovira Services Nigeria • Managed Booking</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-white">
            {submittedRequest ? 'Service Request Submitted' : 'Discuss with Nexovira Management'}
          </h2>
          <p className="text-xs text-blue-200/90 mt-1 max-w-lg leading-relaxed">
            Nexovira Services connects customers with qualified professionals through a managed, transparent, and technology-enabled service-booking experience.
          </p>
        </div>

        {/* Success Confirmation View */}
        {submittedRequest ? (
          <div className="p-6 sm:p-8 space-y-6">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                Your Request is Under Management Review!
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                Thank you, <span className="font-bold text-slate-900 dark:text-white">{submittedRequest.customerName}</span>. 
                Our management team coordinates all project briefs to ensure appropriate scoping and assignment to an approved Nigeria specialist.
              </p>
            </div>

            {/* Reference Card */}
            <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                <span className="text-xs text-slate-500 font-semibold">Tracking Reference:</span>
                <span className="text-xs font-mono font-black text-blue-600 dark:text-blue-400 bg-blue-500/10 px-3 py-1 rounded-lg border border-blue-500/30">
                  {submittedRequest.referenceNumber}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-500">Service:</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200 truncate">{submittedRequest.serviceTitle}</p>
                </div>
                <div>
                  <span className="text-slate-500">Target Budget:</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200">{submittedRequest.budgetExpectation}</p>
                </div>
                <div>
                  <span className="text-slate-500">Initial Status:</span>
                  <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                    {submittedRequest.status}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Contact:</span>
                  <p className="font-medium text-slate-700 dark:text-slate-300 truncate">{submittedRequest.customerEmail}</p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/40 rounded-2xl p-4 text-xs text-blue-900 dark:text-blue-200 space-y-1.5">
              <div className="font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-blue-500" />
                <span>What Happens Next?</span>
              </div>
              <p className="text-[11px] text-blue-800/90 dark:text-blue-300 leading-relaxed">
                1. Nexovira Management reviews your scope within 2-4 business hours.<br />
                2. We pair your project with a qualified, available expert in Nigeria.<br />
                3. The assigned specialist confirms acceptance, and milestone escrow terms are sent directly to your email.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg transition-all"
              >
                Done / Return to Services
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5 text-xs">
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Selected Service or Expert Context Card */}
            {(selectedService || selectedProvider) && (
              <div className="p-3.5 rounded-2xl bg-blue-50/70 dark:bg-slate-950 border border-blue-200 dark:border-blue-900/40 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <img
                    src={selectedService?.image || selectedProvider?.avatarUrl || 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=200&auto=format&fit=crop&q=80'}
                    alt="Context"
                    className="w-12 h-12 rounded-xl object-cover shrink-0 border border-slate-300 dark:border-slate-800"
                  />
                  <div>
                    <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                      {selectedService ? 'Requested Service' : 'Selected Nigeria Specialist'}
                    </span>
                    <h4 className="font-bold text-slate-900 dark:text-white text-xs">
                      {selectedService?.title || selectedProvider?.name}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {selectedService ? `Starting from ₦${selectedService.startingPriceNGN?.toLocaleString() || selectedService.startingPrice * 1500} • ${selectedService.deliveryDays} Days Turnaround` : `${selectedProvider?.title} • ${selectedProvider?.location}`}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 1: Customer Contact Details */}
            <div className="space-y-3">
              <h3 className="font-extrabold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                <User className="w-3.5 h-3.5" />
                <span>1. Your Contact & Location Details</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Your Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Babatunde Adeyemi"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="e.g. babatunde@example.com"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Phone / WhatsApp Contact <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="e.g. +234 812 345 6789"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Location / State in Nigeria
                  </label>
                  <input
                    type="text"
                    value={customerLocation}
                    onChange={(e) => setCustomerLocation(e.target.value)}
                    placeholder="e.g. Lagos, Abuja, Port Harcourt"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Step 2: Project Specifications & Scope */}
            <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
              <h3 className="font-extrabold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                <FileText className="w-3.5 h-3.5" />
                <span>2. Project Specifications & Requirements</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Requested Service Title
                  </label>
                  <input
                    type="text"
                    value={serviceTitle}
                    onChange={(e) => setServiceTitle(e.target.value)}
                    placeholder="e.g. Full-Stack Web Development, Technical Whitepaper..."
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Service Category
                  </label>
                  <select
                    value={serviceCategory}
                    onChange={(e) => setServiceCategory(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-semibold"
                  >
                    <option value="Writing & Content">Writing & Content</option>
                    <option value="Affiliate Support">Affiliate Support & Growth</option>
                    <option value="Technology Services">Technology & Web Services</option>
                    <option value="Digital Solutions">Digital Solutions & UI/UX</option>
                    <option value="AI & Automation">AI & Automation</option>
                    <option value="Other Approved Services">Other Approved Services</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Detailed Project Description & Scope <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  placeholder="Describe your project goals, required deliverables, technical stack or specific formatting preferences, and any important milestones..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl p-3 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 leading-relaxed"
                />
              </div>
            </div>

            {/* Step 3: Budget & Timeline */}
            <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
              <h3 className="font-extrabold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                <DollarSign className="w-3.5 h-3.5" />
                <span>3. Budget Expectation & Timeline</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Budget Expectation
                  </label>
                  <input
                    type="text"
                    value={budgetExpectation}
                    onChange={(e) => setBudgetExpectation(e.target.value)}
                    placeholder="e.g. ₦150,000 - ₦300,000 or $250 USD"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Preferred Timeline / Target Deadline
                  </label>
                  <select
                    value={timeline}
                    onChange={(e) => setTimeline(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-semibold"
                  >
                    <option value="Urgent (< 3 days)">Urgent (&lt; 3 days)</option>
                    <option value="1 - 2 weeks">1 - 2 weeks</option>
                    <option value="2 - 4 weeks">2 - 4 weeks</option>
                    <option value="1 - 2 months">1 - 2 months</option>
                    <option value="Flexible / Ongoing">Flexible / Ongoing</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Step 4: Files, Briefs & Reference Links */}
            <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
              <h3 className="font-extrabold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                <LinkIcon className="w-3.5 h-3.5" />
                <span>4. Relevant Files, References & Links</span>
              </h3>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Reference Links (Websites, Figma, Google Docs, GitHub)
                </label>
                <textarea
                  rows={2}
                  value={linksInput}
                  onChange={(e) => setLinksInput(e.target.value)}
                  placeholder="Paste URLs (one per line): https://..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl p-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Attachments Upload */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Upload Specification Files or Images (Optional)
                </label>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {attachments.map((att, idx) => (
                    <div
                      key={idx}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-2 text-slate-800 dark:text-slate-200"
                    >
                      <FileText className="w-3.5 h-3.5 text-blue-500" />
                      <span className="truncate max-w-[150px] font-medium">{att.name}</span>
                      <span className="text-[10px] text-slate-400">{att.size}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(idx)}
                        className="text-slate-400 hover:text-rose-500"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold cursor-pointer border border-slate-300 dark:border-slate-700 transition-colors">
                  <UploadCloud className="w-4 h-4 text-blue-500" />
                  <span>{isUploadingAttachment ? 'Attaching File...' : 'Attach Image or Brief File'}</span>
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={isUploadingAttachment}
                  />
                </label>
              </div>
            </div>

            {/* Management Notice & Submit */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Coordinated by Nexovira Management • No upfront charges until verified scoping</span>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-1/2 sm:w-auto px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-1/2 sm:w-auto px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Submitting to Management...' : 'Submit to Management'}</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
