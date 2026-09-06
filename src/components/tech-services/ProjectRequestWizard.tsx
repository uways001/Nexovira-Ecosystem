import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle2, 
  UploadCloud, 
  FileText, 
  X, 
  Clock, 
  DollarSign, 
  HelpCircle, 
  AlertCircle, 
  Layers, 
  Send,
  Code2,
  RefreshCw,
  Plus
} from 'lucide-react';
import { 
  TECH_SERVICE_CATEGORIES, 
  BUDGET_RANGES_NGN, 
  BUDGET_RANGES_USD, 
  TIMELINE_OPTIONS, 
  PROJECT_TYPE_OPTIONS, 
  PROJECT_SCOPE_OPTIONS,
  TechServiceCategory,
  SubExpertise
} from '../../data/techServicesCategories';
import { 
  submitServiceRequestToFirestore, 
  getTechServiceCategoriesFromFirestore,
  recordEmailNotificationInFirestore 
} from '../../lib/firestoreService';
import { ServiceRequest, ServiceRequestAttachment } from '../../types';

interface ProjectRequestWizardProps {
  initialCategory?: TechServiceCategory | null;
  initialSubExpertise?: SubExpertise | null;
  initialPrompt?: string;
  currency?: string;
  onComplete?: (request: ServiceRequest) => void;
  onViewMyRequests?: () => void;
  onCancel?: () => void;
}

export const ProjectRequestWizard: React.FC<ProjectRequestWizardProps> = ({
  initialCategory,
  initialSubExpertise,
  initialPrompt = '',
  currency = 'NGN',
  onComplete,
  onViewMyRequests,
  onCancel
}) => {
  // Current Step: 1 through 8, or 9 for Success Screen
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submittedRequest, setSubmittedRequest] = useState<ServiceRequest | null>(null);

  // Form State
  const [projectTitle, setProjectTitle] = useState<string>(
    initialSubExpertise ? `${initialSubExpertise.name} Project` : initialPrompt ? initialPrompt.slice(0, 50) : ''
  );
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    initialCategory ? initialCategory.id : 'web-software'
  );
  const [projectDescription, setProjectDescription] = useState<string>(initialPrompt || '');
  const [projectType, setProjectType] = useState<string>('One-time Project');
  const [projectScope, setProjectScope] = useState<string>('Medium');
  const [budgetOption, setBudgetOption] = useState<string>(
    currency === 'NGN' ? '₦250,000 – ₦500,000' : '$500 – $1,000'
  );
  const [customBudgetAmount, setCustomBudgetAmount] = useState<string>('');
  const [timelineOption, setTimelineOption] = useState<string>('Within Two to Four Weeks');
  
  // Step 6: Attachments & Links
  const [referenceLinks, setReferenceLinks] = useState<string[]>([]);
  const [newLinkInput, setNewLinkInput] = useState<string>('');
  const [attachments, setAttachments] = useState<ServiceRequestAttachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 7: AI Scoping Review State
  const [aiAnalyzing, setAiAnalyzing] = useState<boolean>(false);
  const [aiAnalysisCompleted, setAiAnalysisCompleted] = useState<boolean>(false);
  const [recommendedExpertise, setRecommendedExpertise] = useState<string[]>([]);
  const [newExpertiseInput, setNewExpertiseInput] = useState<string>('');
  const [detectedRequirements, setDetectedRequirements] = useState<string[]>([]);
  const [projectComplexity, setProjectComplexity] = useState<'Low' | 'Medium' | 'High' | 'Enterprise'>('Medium');
  const [clarifyingAnswers, setClarifyingAnswers] = useState<{ question: string; answer: string }[]>([]);
  const [aiSummary, setAiSummary] = useState<string>('');

  // Step 8: Customer Contact Info
  const [customerName, setCustomerName] = useState<string>('');
  const [customerEmail, setCustomerEmail] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [customerLocation, setCustomerLocation] = useState<string>('Lagos, Nigeria');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Populate from initial props
  useEffect(() => {
    if (initialCategory) {
      setSelectedCategoryId(initialCategory.id);
    }
    if (initialSubExpertise) {
      setRecommendedExpertise([initialSubExpertise.name]);
      setDetectedRequirements(initialSubExpertise.typicalDeliverables);
    }
  }, [initialCategory, initialSubExpertise]);

  // Handle AI analysis trigger on entering step 7
  const runAiAnalysis = async () => {
    if (aiAnalysisCompleted) return;
    setAiAnalyzing(true);
    try {
      const response = await fetch('/api/v1/tech-services/ai-analyze-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `${projectTitle ? projectTitle + ': ' : ''}${projectDescription}`
        })
      });

      if (response.ok) {
        const json = await response.json();
        const data = json.data || {};
        if (data.recommendedExpertise && Array.isArray(data.recommendedExpertise)) {
          setRecommendedExpertise(prev => Array.from(new Set([...prev, ...data.recommendedExpertise])));
        }
        if (data.possibleRequirements && Array.isArray(data.possibleRequirements)) {
          setDetectedRequirements(prev => Array.from(new Set([...prev, ...data.possibleRequirements])));
        }
        if (data.projectComplexity) {
          setProjectComplexity(data.projectComplexity);
        }
        if (data.summary) {
          setAiSummary(data.summary);
        }
        if (data.clarifyingQuestions && Array.isArray(data.clarifyingQuestions)) {
          setClarifyingAnswers(data.clarifyingQuestions.map((q: string) => ({ question: q, answer: '' })));
        }
        setAiAnalysisCompleted(true);
      }
    } catch (err) {
      console.warn('AI analysis error in wizard:', err);
    } finally {
      setAiAnalyzing(false);
    }
  };

  const handleNext = () => {
    // Step validation
    if (currentStep === 1) {
      if (!projectDescription.trim() || projectDescription.trim().length < 15) {
        setFormErrors({ description: 'Please describe your project with at least a sentence or two (min 15 characters).' });
        return;
      }
      setFormErrors({});
    }

    if (currentStep === 6) {
      // Moving into Step 7: Trigger AI Analysis
      runAiAnalysis();
    }

    if (currentStep < 8) {
      setCurrentStep(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Add Reference Link
  const handleAddLink = () => {
    if (!newLinkInput.trim()) return;
    let url = newLinkInput.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
    }
    setReferenceLinks([...referenceLinks, url]);
    setNewLinkInput('');
  };

  // File Upload Simulation
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newAttachments: ServiceRequestAttachment[] = Array.from(files).map((f) => ({
      name: f.name,
      url: URL.createObjectURL(f),
      size: `${(f.size / (1024 * 1024)).toFixed(2)} MB`,
      type: f.type || 'application/octet-stream'
    }));

    setAttachments([...attachments, ...newAttachments]);
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  // Toggle requirement in Step 7
  const toggleRequirement = (req: string) => {
    if (detectedRequirements.includes(req)) {
      setDetectedRequirements(detectedRequirements.filter(r => r !== req));
    } else {
      setDetectedRequirements([...detectedRequirements, req]);
    }
  };

  // Remove expertise tag
  const removeExpertise = (tag: string) => {
    setRecommendedExpertise(recommendedExpertise.filter(t => t !== tag));
  };

  const addCustomExpertise = () => {
    if (!newExpertiseInput.trim()) return;
    if (!recommendedExpertise.includes(newExpertiseInput.trim())) {
      setRecommendedExpertise([...recommendedExpertise, newExpertiseInput.trim()]);
    }
    setNewExpertiseInput('');
  };

  // Step 8: Final Submission
  const handleSubmitFinalRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!customerName.trim()) errors.name = 'Full Name is required.';
    if (!customerEmail.trim() || !customerEmail.includes('@')) errors.email = 'Valid Email Address is required.';
    if (!customerPhone.trim()) errors.phone = 'Phone number is required for assignment updates.';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSubmitting(true);
    setFormErrors({});

    try {
      const selectedCat = TECH_SERVICE_CATEGORIES.find(c => c.id === selectedCategoryId);
      const categoryTitle = selectedCat ? selectedCat.title : 'Tech & Digital Services';

      const finalBudget = budgetOption === 'Custom Budget' && customBudgetAmount 
        ? `${currency === 'NGN' ? '₦' : '$'}${customBudgetAmount}` 
        : budgetOption;

      const payload: Partial<ServiceRequest> = {
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim(),
        customerPhone: customerPhone.trim(),
        customerLocation: customerLocation.trim(),
        country: 'Nigeria',
        countryCode: 'NG',
        serviceTitle: projectTitle.trim() || `${categoryTitle} Brief`,
        serviceCategory: categoryTitle,
        requiredExpertise: recommendedExpertise,
        detectedRequirements: detectedRequirements,
        projectComplexity: projectComplexity,
        projectType: projectType,
        projectScope: projectScope,
        projectDescription: projectDescription.trim(),
        budgetExpectation: finalBudget,
        budgetCurrency: currency,
        timeline: timelineOption,
        referenceLinks: referenceLinks,
        attachments: attachments,
        aiClarifications: clarifyingAnswers.filter(a => a.answer.trim().length > 0),
        status: 'Submitted'
      };

      const result = await submitServiceRequestToFirestore(payload);
      setSubmittedRequest(result);

      // 1. Dispatch email notification to Nexovira Management (nexoviratech@gmail.com) and client
      try {
        await fetch('/api/v1/tech-services/notify-management', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'new_project_request',
            payload: result
          })
        });
      } catch (notifyErr) {
        console.warn('Management email notification dispatched asynchronously:', notifyErr);
      }

      // 2. Record notification entry in Firestore audit ledger
      try {
        await recordEmailNotificationInFirestore({
          type: 'project_request',
          recipient: 'nexoviratech@gmail.com',
          subject: `[New Project Request] ${result.referenceNumber}: ${result.serviceTitle}`,
          referenceNumber: result.referenceNumber,
          senderName: customerName.trim(),
          senderEmail: customerEmail.trim(),
          summary: `${result.serviceCategory} • Budget: ${result.budgetExpectation} • Timeline: ${result.timeline}`,
          status: 'SENT',
          deliveryChannel: 'SMTP',
          payload: {
            title: result.serviceTitle,
            category: result.serviceCategory,
            complexity: result.projectComplexity,
            phone: customerPhone.trim()
          }
        });
      } catch (auditErr) {
        console.warn('Could not record notification in Firestore ledger:', auditErr);
      }

      setCurrentStep(9); // Success view
      if (onComplete) onComplete(result);
    } catch (err: any) {
      console.error('Failed to submit project request:', err);
      setFormErrors({ submit: err?.message || 'Failed to submit request. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCategoryObj = TECH_SERVICE_CATEGORIES.find(c => c.id === selectedCategoryId);
  const budgetRanges = currency === 'NGN' ? BUDGET_RANGES_NGN : BUDGET_RANGES_USD;

  // Render Step 9: Submission Success
  if (currentStep === 9 && submittedRequest) {
    return (
      <div className="max-w-3xl mx-auto py-10 px-4 sm:px-6 animate-fadeIn">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 sm:p-12 text-center text-white space-y-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-32 bg-cyan-500/10 blur-3xl pointer-events-none" />

          <div className="w-20 h-20 rounded-3xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-3 max-w-lg mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20">
              <span>Request Received</span>
              <span>•</span>
              <span className="font-mono">{submittedRequest.referenceNumber}</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Your Project Brief Has Been Logged
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Nexovira will review your technical requirements and identify the appropriate vetted specialist from our Expert Network.
            </p>
          </div>

          {/* 4 Process Steps Visualizer */}
          <div className="pt-4 border-t border-slate-800/80">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-6">
              What Happens Next — The Nexovira Managed Workflow
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-left">
              <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 space-y-1">
                <span className="text-[10px] font-black text-cyan-400 uppercase">Step 01</span>
                <h4 className="font-bold text-xs text-white">Request Received</h4>
                <p className="text-[11px] text-slate-300">Project parameters successfully logged in our central database.</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
                <span className="text-[10px] font-black text-slate-500 uppercase">Step 02</span>
                <h4 className="font-bold text-xs text-white">Nexovira Review</h4>
                <p className="text-[11px] text-slate-400">Technical team reviews your deliverables and scope clarity.</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
                <span className="text-[10px] font-black text-slate-500 uppercase">Step 03</span>
                <h4 className="font-bold text-xs text-white">Expertise Matching</h4>
                <p className="text-[11px] text-slate-400">Nexovira pairs the project with an approved expert specialist.</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
                <span className="text-[10px] font-black text-slate-500 uppercase">Step 04</span>
                <h4 className="font-bold text-xs text-white">Execution</h4>
                <p className="text-[11px] text-slate-400">Milestone execution begins with full quality oversight.</p>
              </div>
            </div>
          </div>

          {/* Summary Box */}
          <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 text-left text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400">Category:</span>
              <span className="font-bold text-white">{submittedRequest.serviceCategory}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Selected Timeline:</span>
              <span className="font-bold text-white">{submittedRequest.timeline}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Budget Range:</span>
              <span className="font-bold text-cyan-400 font-mono">{submittedRequest.budgetExpectation}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Assigned Reference:</span>
              <span className="font-bold text-emerald-400 font-mono">{submittedRequest.referenceNumber}</span>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            {onViewMyRequests && (
              <button
                onClick={onViewMyRequests}
                className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-2"
              >
                <span>Track in "My Service Requests"</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={() => {
                setCurrentStep(1);
                setProjectDescription('');
                setProjectTitle('');
                setSubmittedRequest(null);
              }}
              className="w-full sm:w-auto px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition-all"
            >
              Submit Another Project
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
      {/* Wizard Progress Bar */}
      <div className="mb-8 bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg">
        <div className="flex items-center justify-between text-xs mb-2">
          <div className="flex items-center gap-2">
            <span className="font-black text-cyan-400 uppercase tracking-wider">
              Step {currentStep} of 8
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-300 font-bold">
              {currentStep === 1 && 'Tell Us About Your Project'}
              {currentStep === 2 && 'Select Project Type'}
              {currentStep === 3 && 'Define Project Scope'}
              {currentStep === 4 && 'Budget Range'}
              {currentStep === 5 && 'Delivery Timeline'}
              {currentStep === 6 && 'Additional Requirements & Files'}
              {currentStep === 7 && 'AI Project Review'}
              {currentStep === 8 && 'Review & Submit'}
            </span>
          </div>
          {onCancel && (
            <button
              onClick={onCancel}
              className="text-slate-400 hover:text-white transition-colors text-xs flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              <span>Cancel</span>
            </button>
          )}
        </div>

        {/* Progress Fill */}
        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
            style={{ width: `${(currentStep / 8) * 100}%` }}
          />
        </div>
      </div>

      {/* Main Wizard Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl text-white">

        {/* STEP 1: Tell Us About Your Project */}
        {currentStep === 1 && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-xs font-bold border border-cyan-500/20 mb-2">
                <Code2 className="w-3.5 h-3.5" />
                <span>Managed Technical Brief</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                What are you looking to accomplish?
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Describe your project, problem, product idea, or service requirement in your own words.
              </p>
            </div>

            {/* Category Select */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                <span>Primary Ecosystem Category</span>
              </label>
              <select
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
              >
                {TECH_SERVICE_CATEGORIES.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.title} — {cat.tagline}
                  </option>
                ))}
              </select>
            </div>

            {/* Project Title */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">
                Project Title or Initiative Name (Optional)
              </label>
              <input
                type="text"
                value={projectTitle}
                onChange={(e) => setProjectTitle(e.target.value)}
                placeholder="e.g. Modern E-Commerce Platform for Fashion Brand"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>

            {/* Project Description Textarea */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300">
                  Project Description & Vision <span className="text-cyan-400">*</span>
                </label>
                <span className="text-[11px] text-slate-500">
                  {projectDescription.length} characters
                </span>
              </div>
              <textarea
                rows={6}
                value={projectDescription}
                onChange={(e) => {
                  setProjectDescription(e.target.value);
                  if (formErrors.description) setFormErrors({});
                }}
                placeholder="Tell us what you want to build, the key features, your target audience, or any specific problem you want solved..."
                className={`w-full bg-slate-950 border ${
                  formErrors.description ? 'border-rose-500' : 'border-slate-800'
                } rounded-2xl p-4 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors resize-none leading-relaxed`}
              />
              {formErrors.description && (
                <p className="text-xs text-rose-400 flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{formErrors.description}</span>
                </p>
              )}
            </div>

            {/* Sample Prompts Pills */}
            <div className="pt-2">
              <p className="text-[11px] text-slate-400 font-bold mb-2">Or click an example brief to start:</p>
              <div className="flex flex-wrap gap-2">
                {[
                  'Build an automated AI support agent integrated with WhatsApp and email',
                  'Design and develop a modern multi-vendor e-commerce web platform',
                  'Create an interactive Figma design system and mobile app UI for iOS & Android',
                  'Perform a comprehensive cybersecurity audit and penetration test on our API'
                ].map((sample, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setProjectDescription(sample);
                      setProjectTitle(sample.slice(0, 45));
                    }}
                    className="text-[11px] bg-slate-950 border border-slate-800 hover:border-cyan-500/60 hover:text-cyan-400 text-slate-300 px-3 py-1.5 rounded-lg text-left transition-all"
                  >
                    "{sample}"
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Project Type */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                What type of project is this?
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Help Nexovira understand the engagement structure required.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {PROJECT_TYPE_OPTIONS.map((type) => {
                const isSelected = projectType === type;
                return (
                  <div
                    key={type}
                    onClick={() => setProjectType(type)}
                    className={`p-5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-cyan-500/10 border-cyan-500 text-white shadow-lg shadow-cyan-500/10'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="space-y-1">
                      <h4 className="font-bold text-sm">{type}</h4>
                      <p className="text-xs text-slate-400">
                        {type === 'One-time Project' && 'Defined scope with clear start, deliverables, and completion.'}
                        {type === 'Short-term Project' && 'Delivered over a few weeks with targeted milestones.'}
                        {type === 'Long-term Project' && 'Multi-month initiative with phases or continuous development.'}
                        {type === 'Consultation' && 'Strategic advisory, technical auditing, or architecture guidance.'}
                        {type === 'Ongoing Support' && 'Monthly maintenance, updates, and SLA support retainer.'}
                        {type === "I'm Not Sure Yet" && 'Nexovira will help recommend the optimal structure.'}
                      </p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ml-3 ${
                      isSelected ? 'border-cyan-400 bg-cyan-500 text-slate-950' : 'border-slate-700'
                    }`}>
                      {isSelected && <CheckCircle2 className="w-4 h-4" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 3: Project Scope */}
        {currentStep === 3 && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Select the estimated project scope
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Scale determines the specialization depth and talent allocation.
              </p>
            </div>

            <div className="space-y-3">
              {PROJECT_SCOPE_OPTIONS.map((item) => {
                const isSelected = projectScope === item.label;
                return (
                  <div
                    key={item.label}
                    onClick={() => setProjectScope(item.label)}
                    className={`p-5 rounded-2xl border cursor-pointer transition-all flex items-start justify-between ${
                      isSelected
                        ? 'bg-cyan-500/10 border-cyan-500 text-white shadow-lg shadow-cyan-500/10'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white">{item.label} Scope</span>
                        {item.label === 'Medium' && (
                          <span className="text-[10px] bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded-full font-bold">
                            Most Common
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{item.description}</p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ml-3 ${
                      isSelected ? 'border-cyan-400 bg-cyan-500 text-slate-950' : 'border-slate-700'
                    }`}>
                      {isSelected && <CheckCircle2 className="w-4 h-4" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 4: Budget Range */}
        {currentStep === 4 && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20 mb-2">
                <DollarSign className="w-3.5 h-3.5" />
                <span>Financial Alignment</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                What is your anticipated budget?
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Nexovira manages all project contracts. Budget guidelines help match specialists with suitable capacity.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {budgetRanges.map((range) => {
                const isSelected = budgetOption === range;
                return (
                  <div
                    key={range}
                    onClick={() => setBudgetOption(range)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-cyan-500/10 border-cyan-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <span className="font-bold text-sm">{range}</span>
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      isSelected ? 'border-cyan-400 bg-cyan-500' : 'border-slate-700'
                    }`} />
                  </div>
                );
              })}
            </div>

            {budgetOption === 'Custom Budget' && (
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <label className="text-xs font-bold text-slate-300">Enter custom amount in {currency}:</label>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 font-mono text-sm">{currency === 'NGN' ? '₦' : '$'}</span>
                  <input
                    type="number"
                    value={customBudgetAmount}
                    onChange={(e) => setCustomBudgetAmount(e.target.value)}
                    placeholder="e.g. 750000"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 5: Delivery Timeline */}
        {currentStep === 5 && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-bold border border-blue-500/20 mb-2">
                <Clock className="w-3.5 h-3.5" />
                <span>Scheduling</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                When do you need this completed?
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Indicate your preferred completion timeline.
              </p>
            </div>

            <div className="space-y-3">
              {TIMELINE_OPTIONS.map((time) => {
                const isSelected = timelineOption === time;
                return (
                  <div
                    key={time}
                    onClick={() => setTimelineOption(time)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-cyan-500/10 border-cyan-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <span className="font-bold text-sm">{time}</span>
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      isSelected ? 'border-cyan-400 bg-cyan-500' : 'border-slate-700'
                    }`} />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 6: Additional Requirements & Files */}
        {currentStep === 6 && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Supporting files & references
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Attach wireframes, specifications, documents, or reference links (Optional).
              </p>
            </div>

            {/* File Upload Zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="p-8 rounded-2xl border-2 border-dashed border-slate-800 hover:border-cyan-500/60 bg-slate-950/60 text-center cursor-pointer transition-all group"
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileUpload}
              />
              <UploadCloud className="w-10 h-10 text-slate-500 group-hover:text-cyan-400 mx-auto mb-3 transition-colors" />
              <p className="text-sm font-bold text-white">Click or drag & drop files here</p>
              <p className="text-xs text-slate-500 mt-1">PDF, DOCX, PNG, JPG, ZIP, or Figma export files (up to 25MB)</p>
            </div>

            {/* Attached Files List */}
            {attachments.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-300">Attached Files ({attachments.length})</h4>
                <div className="space-y-1.5">
                  {attachments.map((file, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
                        <span className="font-bold text-white truncate max-w-xs">{file.name}</span>
                        {file.size && <span className="text-slate-500">({file.size})</span>}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(idx)}
                        className="text-slate-500 hover:text-rose-400 p-1"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reference Links */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <label className="text-xs font-bold text-slate-300">Reference URLs or Inspiration Websites</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newLinkInput}
                  onChange={(e) => setNewLinkInput(e.target.value)}
                  placeholder="https://example.com/project-benchmark"
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddLink(); } }}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
                <button
                  type="button"
                  onClick={handleAddLink}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl"
                >
                  Add Link
                </button>
              </div>

              {referenceLinks.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {referenceLinks.map((link, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs text-cyan-400 font-mono">
                      <span className="truncate max-w-xs">{link}</span>
                      <button
                        type="button"
                        onClick={() => setReferenceLinks(referenceLinks.filter((_, i) => i !== idx))}
                        className="text-slate-500 hover:text-rose-400"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 7: AI Project Review ("Let Nexovira AI Help Refine Your Request") */}
        {currentStep === 7 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-xs font-bold border border-cyan-500/30 mb-2">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Powered by Gemini 3.8 Flash</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Let Nexovira AI Help Refine Your Request
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  We reviewed your brief to extract core technical competencies, deliverables, and scope clarity.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setAiAnalysisCompleted(false);
                  runAiAnalysis();
                }}
                disabled={aiAnalyzing}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 flex items-center gap-1.5 shrink-0 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${aiAnalyzing ? 'animate-spin text-cyan-400' : ''}`} />
                <span>Re-Analyze</span>
              </button>
            </div>

            {aiAnalyzing ? (
              <div className="p-12 text-center rounded-2xl bg-slate-950 border border-slate-800 text-slate-400 space-y-3">
                <RefreshCw className="w-6 h-6 animate-spin text-cyan-400 mx-auto" />
                <p className="text-xs font-bold text-white">Analyzing project requirements with Nexovira AI Technical Engine...</p>
                <p className="text-[11px] text-slate-500">Extracting required expertise, possible deliverables, and technical complexity.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Summary Card */}
                {aiSummary && (
                  <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/30 text-xs text-slate-300 leading-relaxed">
                    <strong className="text-cyan-400 font-bold block mb-1">AI Brief Summary:</strong>
                    {aiSummary}
                  </div>
                )}

                {/* Complexity Assessment */}
                <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-950 border border-slate-800">
                  <div>
                    <span className="text-xs text-slate-400">Assessed Project Complexity:</span>
                    <h4 className="text-sm font-bold text-white mt-0.5">{projectComplexity}</h4>
                  </div>
                  <div className="flex gap-1.5">
                    {(['Low', 'Medium', 'High', 'Enterprise'] as const).map((comp) => (
                      <button
                        key={comp}
                        type="button"
                        onClick={() => setProjectComplexity(comp)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                          projectComplexity === comp
                            ? 'bg-cyan-500 text-slate-950'
                            : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                        }`}
                      >
                        {comp}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Recommended Expertise Tags */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-300">
                      Recommended Expertise Needed:
                    </label>
                    <span className="text-[11px] text-slate-500">Click to remove or add more</span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {recommendedExpertise.map((skill, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold"
                      >
                        <span>{skill}</span>
                        <button
                          type="button"
                          onClick={() => removeExpertise(skill)}
                          className="text-cyan-400 hover:text-white"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>

                  {/* Add Custom Skill */}
                  <div className="flex gap-2 pt-1 max-w-sm">
                    <input
                      type="text"
                      value={newExpertiseInput}
                      onChange={(e) => setNewExpertiseInput(e.target.value)}
                      placeholder="Add another skill or tool..."
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomExpertise(); } }}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                    <button
                      type="button"
                      onClick={addCustomExpertise}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add</span>
                    </button>
                  </div>
                </div>

                {/* Possible Requirements Checklist */}
                {detectedRequirements.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <label className="text-xs font-bold text-slate-300">
                      Identified Deliverables / Features (Check to include in brief):
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {detectedRequirements.map((req, idx) => (
                        <div
                          key={idx}
                          onClick={() => toggleRequirement(req)}
                          className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 cursor-pointer flex items-center justify-between text-xs transition-colors"
                        >
                          <span className="text-slate-300">{req}</span>
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 ml-2" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Clarifying Questions */}
                {clarifyingAnswers.length > 0 && (
                  <div className="space-y-3 pt-2 border-t border-slate-800">
                    <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Clarifying Details to Fast-Track Your Match (Optional):</span>
                    </label>

                    {clarifyingAnswers.map((item, idx) => (
                      <div key={idx} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                        <p className="text-xs text-slate-300 font-bold">{item.question}</p>
                        <input
                          type="text"
                          value={item.answer}
                          onChange={(e) => {
                            const updated = [...clarifyingAnswers];
                            updated[idx].answer = e.target.value;
                            setClarifyingAnswers(updated);
                          }}
                          placeholder="Your answer or additional note..."
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Quality Safeguard Notice */}
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400 flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    <strong>Nexovira Managed Assurance:</strong> AI assists in organizing your brief. Final pricing, timeline agreements, and talent assignment are managed and approved by Nexovira administration.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 8: Review & Submit */}
        {currentStep === 8 && (
          <form onSubmit={handleSubmitFinalRequest} className="space-y-6 animate-fadeIn">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-xs font-bold border border-cyan-500/30 mb-2">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Final Verification</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Review your brief & submit
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Provide your contact details so Nexovira management can coordinate your assignment.
              </p>
            </div>

            {/* Brief Summary Box */}
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-sm font-black text-white">Project Scope Summary</h3>
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="text-xs text-cyan-400 hover:underline font-bold"
                >
                  Edit Brief
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block">Category</span>
                  <span className="font-bold text-white mt-0.5 block">{selectedCategoryObj?.title}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Type</span>
                  <span className="font-bold text-white mt-0.5 block">{projectType}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Scope</span>
                  <span className="font-bold text-white mt-0.5 block">{projectScope}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Budget Range</span>
                  <span className="font-bold text-cyan-400 font-mono mt-0.5 block">{budgetOption}</span>
                </div>
              </div>

              <div>
                <span className="text-slate-500 text-xs block mb-1">Project Description:</span>
                <p className="text-xs text-slate-300 bg-slate-900/60 p-3 rounded-xl leading-relaxed">
                  {projectDescription}
                </p>
              </div>

              {recommendedExpertise.length > 0 && (
                <div>
                  <span className="text-slate-500 text-xs block mb-1">Required Competencies:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {recommendedExpertise.map((skill, idx) => (
                      <span key={idx} className="text-[11px] bg-slate-900 text-slate-300 px-2 py-0.5 rounded-md border border-slate-800">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Contact Details Inputs */}
            <div className="space-y-4 pt-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Your Contact Information</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">
                    Full Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Oluwaseun Adeleke"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                  {formErrors.name && <p className="text-xs text-rose-400 mt-0.5">{formErrors.name}</p>}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">
                    Email Address <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="e.g. oluwaseun@company.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                  {formErrors.email && <p className="text-xs text-rose-400 mt-0.5">{formErrors.email}</p>}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">
                    Phone / WhatsApp Number <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="+234 800 000 0000"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                  {formErrors.phone && <p className="text-xs text-rose-400 mt-0.5">{formErrors.phone}</p>}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Location / City</label>
                  <input
                    type="text"
                    value={customerLocation}
                    onChange={(e) => setCustomerLocation(e.target.value)}
                    placeholder="e.g. Lagos, Nigeria"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            </div>

            {formErrors.submit && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                {formErrors.submit}
              </div>
            )}

            {/* Submit CTA */}
            <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <button
                type="button"
                onClick={handleBack}
                className="w-full sm:w-auto px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-sm rounded-xl shadow-xl shadow-cyan-500/20 transition-all flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Transmitting Project Brief...</span>
                  </>
                ) : (
                  <>
                    <span>Submit Project Request</span>
                    <Send className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Bottom Wizard Navigation for Steps 1 through 7 */}
        {currentStep < 8 && (
          <div className="mt-8 pt-6 border-t border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={handleBack}
              disabled={currentStep === 1}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-colors ${
                currentStep === 1
                  ? 'opacity-40 cursor-not-allowed text-slate-600'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
              }`}
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            <button
              type="button"
              onClick={handleNext}
              className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-2"
            >
              <span>{currentStep === 7 ? 'Continue to Final Review' : 'Next Step'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
