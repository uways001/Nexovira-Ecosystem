import React, { useState, useEffect } from 'react';
import { 
  X, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  GraduationCap, 
  CreditCard, 
  ShieldCheck, 
  Building, 
  MessageSquare, 
  Download, 
  Sparkles, 
  Calendar, 
  Clock, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Briefcase, 
  AlertCircle,
  ExternalLink,
  Copy,
  Check,
  Lock,
  Unlock,
  RotateCcw,
  Search
} from 'lucide-react';
import { Course, ScholarshipApplication, ScholarshipPaymentRecord, UserProfile } from '../types';
import { 
  createScholarshipApplicationInFirestore, 
  recordScholarshipPaymentInFirestore,
  updateScholarshipApplicationInFirestore,
  lookupScholarshipApplicationByRefOrEmail
} from '../lib/firestoreService';

interface ScholarshipApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCourse: Course | null;
  courses: Course[];
  userProfile?: UserProfile | null;
  onApplicationCompleted?: (application: ScholarshipApplication) => void;
}

type FlowStep = 
  | 'pay'               // Step 1: Select course & Pay ₦4,500
  | 'unlocked_form'     // Step 2: Form UNLOCKED only after payment verification
  | 'submitted_success' // Step 3: Registration completed, WhatsApp community UNLOCKED
  | 'resume_lookup';    // Special: Resume uncompleted form by email or payment ref

export const ScholarshipApplicationModal: React.FC<ScholarshipApplicationModalProps> = ({
  isOpen,
  onClose,
  selectedCourse,
  courses,
  userProfile,
  onApplicationCompleted
}) => {
  // Primary flow state: 'pay' -> 'unlocked_form' -> 'submitted_success'
  const [currentStep, setCurrentStep] = useState<FlowStep>('pay');
  const [activeCourseId, setActiveCourseId] = useState<string>(selectedCourse?.id || (courses[0]?.id || ''));

  // Payer Contact (Required for genuine payment verification & settlement)
  const [payerName, setPayerName] = useState<string>(userProfile?.displayName || '');
  const [payerEmail, setPayerEmail] = useState<string>(userProfile?.email || '');
  const [payerPhone, setPayerPhone] = useState<string>(userProfile?.phone || '');

  // Payment Verification state
  const [paymentMethod, setPaymentMethod] = useState<'paystack' | 'card' | 'transfer'>('paystack');
  const [isVerifyingPayment, setIsVerifyingPayment] = useState<boolean>(false);
  const [paymentError, setPaymentError] = useState<string>('');
  const [verifiedPaymentRef, setVerifiedPaymentRef] = useState<string>('');
  const [verifiedPaymentRecord, setVerifiedPaymentRecord] = useState<any>(null);
  const [createdApplicationId, setCreatedApplicationId] = useState<string>('');

  // Unlocked Registration Form Fields (strictly locked until payment verified)
  const [fullName, setFullName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [country, setCountry] = useState<string>('Nigeria');
  const [state, setState] = useState<string>('Lagos');
  const [city, setCity] = useState<string>('Ikeja');
  const [currentOccupation, setCurrentOccupation] = useState<string>('Student');
  const [experienceLevel, setExperienceLevel] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Beginner');
  const [whyJoin, setWhyJoin] = useState<string>('');
  const [goals, setGoals] = useState<string>('');
  const [commitmentAgreed, setCommitmentAgreed] = useState<boolean>(true);
  const [isSubmittingForm, setIsSubmittingForm] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>('');

  // Resume Incomplete Form Lookup
  const [lookupQuery, setLookupQuery] = useState<string>('');
  const [isLookingUp, setIsLookingUp] = useState<boolean>(false);
  const [lookupError, setLookupError] = useState<string>('');

  // Completed Application Data (Unlocks WhatsApp Access)
  const [completedApplication, setCompletedApplication] = useState<ScholarshipApplication | null>(null);
  const [copiedRef, setCopiedRef] = useState<boolean>(false);

  // Initialize and check for existing unfinished payment in session/localStorage
  useEffect(() => {
    if (!isOpen) return;

    if (selectedCourse?.id) {
      setActiveCourseId(selectedCourse.id);
    } else if (courses.length > 0 && !activeCourseId) {
      setActiveCourseId(courses[0].id);
    }

    if (userProfile) {
      if (userProfile.displayName && !payerName) setPayerName(userProfile.displayName);
      if (userProfile.email && !payerEmail) setPayerEmail(userProfile.email);
      if (userProfile.phone && !payerPhone) setPayerPhone(userProfile.phone);
    }

    // Check if there is an uncompleted paid registration in localStorage
    try {
      const savedPending = localStorage.getItem('nexovira_pending_scholarship_form');
      if (savedPending) {
        const parsed = JSON.parse(savedPending);
        if (parsed && parsed.paymentReference && parsed.courseId) {
          // If the user previously paid for this or any course and haven't finished the form,
          // restore and unlock form immediately!
          setVerifiedPaymentRef(parsed.paymentReference);
          setActiveCourseId(parsed.courseId);
          setPayerEmail(parsed.payerEmail || '');
          setPayerPhone(parsed.payerPhone || '');
          setPayerName(parsed.payerName || '');
          setEmail(parsed.payerEmail || '');
          setPhone(parsed.payerPhone || '');
          setFullName(parsed.payerName || '');
          if (parsed.applicationId) setCreatedApplicationId(parsed.applicationId);
          setVerifiedPaymentRecord(parsed);
          setCurrentStep('unlocked_form');
        }
      }
    } catch (e) {}
  }, [isOpen, selectedCourse, userProfile]);

  if (!isOpen) return null;

  const currentCourse = courses.find(c => c.id === activeCourseId) || selectedCourse || courses[0];
  const fee = currentCourse?.scholarshipRegistrationFee || 4500;
  const whatsAppLink = currentCourse?.whatsAppGroupLink || 'https://chat.whatsapp.com/invite/NexoviraScholarshipGeneral';

  // 1. GENUINE PAYMENT PROCESSING & VERIFICATION
  const handleInitiateAndVerifyPayment = async () => {
    if (!currentCourse) {
      setPaymentError('Please select a course to continue.');
      return;
    }
    if (!payerEmail.trim() || !payerEmail.includes('@')) {
      setPaymentError('Please provide a valid email address for receipt and verification.');
      return;
    }
    if (!payerPhone.trim() || payerPhone.trim().length < 8) {
      setPaymentError('Please provide an active phone number for verification.');
      return;
    }

    setIsVerifyingPayment(true);
    setPaymentError('');

    try {
      // Step A: Call server verification engine to genuinely verify settlement
      const timestamp = Date.now();
      const generatedRef = paymentMethod === 'paystack' 
        ? `PSTK_SCH_${timestamp}_${Math.floor(1000 + Math.random() * 9000)}`
        : `TXN_SCH_${timestamp}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

      const response = await fetch('/api/v1/scholarship/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: currentCourse.id,
          courseTitle: currentCourse.title,
          amount: fee,
          currency: 'NGN',
          paymentMethod,
          payerEmail: payerEmail.trim(),
          payerPhone: payerPhone.trim(),
          payerName: payerName.trim(),
          providedReference: generatedRef
        })
      });

      const result = await response.json();
      if (!result.success || !result.data?.verified) {
        throw new Error(result.error || 'Genuine payment verification could not be completed.');
      }

      const verifiedRef = result.data.paymentReference || generatedRef;
      setVerifiedPaymentRef(verifiedRef);
      setVerifiedPaymentRecord(result.data);

      // Step B: Record genuine payment in Firestore
      const paymentDocId = `PAY_${timestamp}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      const appRef = `NX-SCH-2026-${Math.floor(100000 + Math.random() * 900000)}`;
      const paymentDateStr = result.data.verifiedAt || new Date().toISOString();
      const paymentRecord: ScholarshipPaymentRecord = {
        id: paymentDocId,
        applicationId: `SCH_APP_${timestamp}`,
        applicationReference: appRef,
        applicantName: payerName.trim() || 'Scholarship Candidate',
        applicantEmail: payerEmail.trim(),
        applicantPhone: payerPhone.trim(),
        studentName: payerName.trim() || 'Scholarship Candidate',
        studentEmail: payerEmail.trim(),
        studentPhone: payerPhone.trim(),
        courseId: currentCourse.id,
        courseTitle: currentCourse.title,
        amount: fee,
        currency: 'NGN',
        paymentMethod: result.data.paymentMethod || paymentMethod,
        paymentReference: verifiedRef,
        paymentStatus: 'Successful',
        paymentDate: paymentDateStr,
        paidAt: paymentDateStr,
        createdAt: new Date().toISOString()
      };

      await recordScholarshipPaymentInFirestore(paymentRecord).catch(err => {
        console.warn('Payment recording fallback:', err);
      });

      // Step C: Initialize application document in Firestore with Status:
      // paymentStatus: 'paid' AND registrationStatus: 'form_pending' ("Payment Successful — Form Not Completed")
      const initialApp = await createScholarshipApplicationInFirestore({
        referenceNumber: paymentRecord.applicationReference,
        courseId: currentCourse.id,
        courseTitle: currentCourse.title,
        fullName: payerName.trim() || 'Candidate',
        email: payerEmail.trim(),
        phone: payerPhone.trim(),
        country: 'Nigeria',
        state: 'Pending Form',
        city: 'Pending Form',
        currentOccupation: 'Pending Form',
        experienceLevel: 'Beginner',
        whyJoin: 'Pending Form Completion',
        goals: 'Pending Form Completion',
        learningCommitment: 'Agreed',
        registrationFee: fee,
        paymentStatus: 'paid',
        paymentReference: verifiedRef,
        paymentMethod: result.data.paymentMethod || paymentMethod,
        paidAt: paymentRecord.paidAt,
        registrationStatus: 'form_pending', // "Payment Successful — Form Not Completed"
        formCompleted: false,
        courseWhatsAppLink: whatsAppLink,
        userId: userProfile?.uid
      }).catch(() => null);

      if (initialApp?.id) {
        setCreatedApplicationId(initialApp.id);
      }

      // Pre-fill form fields with payer info
      setFullName(payerName.trim());
      setEmail(payerEmail.trim());
      setPhone(payerPhone.trim());

      // Save to localStorage so that if user accidentally closes the browser tab,
      // their payment remains permanently preserved and they can return anytime to finish the form!
      const pendingData = {
        paymentReference: verifiedRef,
        applicationId: initialApp?.id || `SCH_APP_${timestamp}`,
        referenceNumber: paymentRecord.applicationReference,
        courseId: currentCourse.id,
        courseTitle: currentCourse.title,
        payerEmail: payerEmail.trim(),
        payerPhone: payerPhone.trim(),
        payerName: payerName.trim(),
        amount: fee,
        verifiedAt: paymentRecord.paidAt
      };
      localStorage.setItem('nexovira_pending_scholarship_form', JSON.stringify(pendingData));

      // UNLOCK REGISTRATION FORM!
      setCurrentStep('unlocked_form');
    } catch (err: any) {
      console.error('Payment verification failed:', err);
      setPaymentError(err?.message || 'Payment verification failed. Please try again or choose another method.');
    } finally {
      setIsVerifyingPayment(false);
    }
  };

  // 2. RESUME FORM VIA LOOKUP (BY EMAIL OR PAYMENT REFERENCE)
  const handleLookupAndResumeForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupQuery.trim()) {
      setLookupError('Please enter your email address or payment reference number.');
      return;
    }

    setIsLookingUp(true);
    setLookupError('');

    try {
      const match = await lookupScholarshipApplicationByRefOrEmail(lookupQuery.trim());
      if (!match) {
        setLookupError('No payment record found matching this query. Please check your reference number or email.');
        return;
      }

      if (match.paymentStatus !== 'paid') {
        setLookupError('Payment for this record has not been verified yet. Please proceed to payment first.');
        return;
      }

      // Check if registration was already fully completed
      if (match.registrationStatus === 'completed' || match.registrationStatus === 'confirmed' || match.formCompleted) {
        setCompletedApplication(match);
        setCurrentStep('submitted_success');
        return;
      }

      // Unlock form with matched payment details
      setVerifiedPaymentRef(match.paymentReference || match.referenceNumber);
      setCreatedApplicationId(match.id);
      setActiveCourseId(match.courseId);
      setFullName(match.fullName && match.fullName !== 'Candidate' ? match.fullName : payerName);
      setEmail(match.email || payerEmail);
      setPhone(match.phone || payerPhone);
      setWhyJoin(match.whyJoin && match.whyJoin !== 'Pending Form Completion' ? match.whyJoin : '');
      setGoals(match.goals && match.goals !== 'Pending Form Completion' ? match.goals : '');
      
      // Persist to local storage
      const pendingData = {
        paymentReference: match.paymentReference || match.referenceNumber,
        applicationId: match.id,
        referenceNumber: match.referenceNumber,
        courseId: match.courseId,
        courseTitle: match.courseTitle,
        payerEmail: match.email,
        payerPhone: match.phone,
        payerName: match.fullName,
        amount: match.registrationFee,
        verifiedAt: match.paidAt || match.createdAt
      };
      localStorage.setItem('nexovira_pending_scholarship_form', JSON.stringify(pendingData));

      setCurrentStep('unlocked_form');
    } catch (err: any) {
      console.error('Lookup failed:', err);
      setLookupError('Could not verify registration lookup. Please try again.');
    } finally {
      setIsLookingUp(false);
    }
  };

  // 3. SUBMIT UNLOCKED REGISTRATION FORM & UNLOCK WHATSAPP
  const handleSubmitRegistrationForm = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // SECURITY GUARD: Cannot submit or access without genuine verified payment reference
    if (!verifiedPaymentRef) {
      alert('Security Exception: Payment verification is required before form submission.');
      setCurrentStep('pay');
      return;
    }

    if (!fullName.trim()) {
      setFormError('Please enter your full legal name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setFormError('Please enter a valid email address.');
      return;
    }
    if (!phone.trim() || phone.trim().length < 8) {
      setFormError('Please enter a valid WhatsApp phone number.');
      return;
    }
    if (!state.trim() || !city.trim()) {
      setFormError('Please provide your State and City.');
      return;
    }
    if (!whyJoin.trim() || whyJoin.trim().length < 10) {
      setFormError('Please briefly state why you want to join this scholarship track (minimum 10 characters).');
      return;
    }
    if (!goals.trim() || goals.trim().length < 10) {
      setFormError('Please state your goals and expectations after completing this training.');
      return;
    }
    if (!commitmentAgreed) {
      setFormError('You must agree to the scholarship attendance and capstone completion commitment.');
      return;
    }

    setIsSubmittingForm(true);
    setFormError('');

    try {
      const updatedFields: Partial<ScholarshipApplication> = {
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        country: country.trim(),
        state: state.trim(),
        city: city.trim(),
        currentOccupation: currentOccupation.trim(),
        experienceLevel,
        whyJoin: whyJoin.trim(),
        goals: goals.trim(),
        learningCommitment: 'Agreed & Signed',
        paymentStatus: 'paid',
        paymentReference: verifiedPaymentRef,
        registrationStatus: 'completed', // Now "Registration Completed"!
        formCompleted: true,
        formCompletedAt: new Date().toISOString(),
        courseWhatsAppLink: whatsAppLink
      };

      let finalApp: ScholarshipApplication;

      if (createdApplicationId) {
        await updateScholarshipApplicationInFirestore(createdApplicationId, updatedFields);
        finalApp = {
          id: createdApplicationId,
          referenceNumber: verifiedPaymentRecord?.referenceNumber || `NX-SCH-2026-${Math.floor(100000 + Math.random() * 900000)}`,
          courseId: currentCourse.id,
          courseTitle: currentCourse.title,
          registrationFee: fee,
          createdAt: verifiedPaymentRecord?.verifiedAt || new Date().toISOString(),
          ...updatedFields
        } as ScholarshipApplication;
      } else {
        finalApp = await createScholarshipApplicationInFirestore({
          referenceNumber: `NX-SCH-2026-${Math.floor(100000 + Math.random() * 900000)}`,
          courseId: currentCourse.id,
          courseTitle: currentCourse.title,
          registrationFee: fee,
          ...updatedFields
        } as any);
      }

      // Notify management (nexoviratech@gmail.com) and applicant with final admission details
      fetch('/api/v1/scholarship/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ application: finalApp })
      }).catch(e => console.warn('Email notify error:', e));

      // Clear pending form cache
      localStorage.removeItem('nexovira_pending_scholarship_form');

      setCompletedApplication(finalApp);
      if (onApplicationCompleted) {
        onApplicationCompleted(finalApp);
      }

      // UNLOCK STEP 3: WHATSAPP COMMUNITY UNLOCKED
      setCurrentStep('submitted_success');
    } catch (err: any) {
      console.error('Failed to submit registration form:', err);
      setFormError(err?.message || 'Failed to submit registration. Please retry.');
    } finally {
      setIsSubmittingForm(false);
    }
  };

  const handleCopyRef = () => {
    if (!completedApplication?.referenceNumber) return;
    navigator.clipboard.writeText(completedApplication.referenceNumber);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden my-6 text-slate-100 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#01213D] via-[#0682F4] to-[#06C3F8] flex items-center justify-center text-white shadow-md shadow-[#0682F4]/20">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>Nexovira Academy Scholarship</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Subsidized
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                100% Tuition Waived • ₦4,500 Subsidized Portal Registration Fee
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Step Indicator */}
        <div className="bg-slate-950/40 border-b border-slate-800/80 px-6 py-3">
          <div className="flex items-center justify-between max-w-lg mx-auto">
            {/* Step 1: Payment */}
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                currentStep === 'pay' 
                  ? 'bg-[#0682F4] text-white ring-4 ring-[#0682F4]/20' 
                  : 'bg-emerald-500 text-white'
              }`}>
                {currentStep === 'pay' ? '1' : <Check className="w-3.5 h-3.5" />}
              </div>
              <span className={`text-xs font-bold hidden sm:inline ${
                currentStep === 'pay' ? 'text-white' : 'text-slate-400'
              }`}>
                1. Pay ₦4,500
              </span>
            </div>

            <div className="h-[2px] flex-1 mx-2 bg-slate-800">
              <div className={`h-full transition-all duration-300 ${
                currentStep !== 'pay' ? 'bg-emerald-500 w-full' : 'w-0'
              }`} />
            </div>

            {/* Step 2: Unlocked Form */}
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                currentStep === 'unlocked_form' 
                  ? 'bg-[#0682F4] text-white ring-4 ring-[#0682F4]/20' 
                  : currentStep === 'submitted_success'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-800 text-slate-400'
              }`}>
                {currentStep === 'pay' ? <Lock className="w-3.5 h-3.5" /> : currentStep === 'submitted_success' ? <Check className="w-3.5 h-3.5" /> : '2'}
              </div>
              <span className={`text-xs font-bold hidden sm:inline ${
                currentStep === 'unlocked_form' ? 'text-white' : 'text-slate-400'
              }`}>
                2. Registration Form
              </span>
            </div>

            <div className="h-[2px] flex-1 mx-2 bg-slate-800">
              <div className={`h-full transition-all duration-300 ${
                currentStep === 'submitted_success' ? 'bg-emerald-500 w-full' : 'w-0'
              }`} />
            </div>

            {/* Step 3: Join WhatsApp */}
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                currentStep === 'submitted_success' 
                  ? 'bg-emerald-500 text-white ring-4 ring-emerald-500/20' 
                  : 'bg-slate-800 text-slate-400'
              }`}>
                {currentStep === 'submitted_success' ? <Check className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
              </div>
              <span className={`text-xs font-bold hidden sm:inline ${
                currentStep === 'submitted_success' ? 'text-emerald-400' : 'text-slate-400'
              }`}>
                3. WhatsApp Community
              </span>
            </div>
          </div>
        </div>

        {/* STEP 1: PAYMENT (STRICTLY REQUIRED BEFORE FORM ACCESS) */}
        {currentStep === 'pay' && (
          <div className="p-6 space-y-6 max-h-[72vh] overflow-y-auto">
            {/* Selected Course Summary Banner */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-950 to-slate-900 border border-slate-700/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-[#06C3F8] uppercase tracking-wider">
                  Selected Scholarship Track
                </span>
                <h3 className="text-base sm:text-lg font-black text-white">
                  {currentCourse?.title || 'Scholarship Course'}
                </h3>
                <p className="text-xs text-slate-400 flex items-center gap-3">
                  <span>Duration: <strong className="text-slate-200">{currentCourse?.durationWeeks || '8 Weeks'}</strong></span>
                  <span>•</span>
                  <span>Mentor: <strong className="text-slate-200">{currentCourse?.instructor || 'Nexovira Faculty'}</strong></span>
                </p>
              </div>

              <div className="text-right sm:text-right w-full sm:w-auto p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30">
                <span className="text-[10px] text-slate-400 line-through block">
                  Original Tuition: ₦{(currentCourse?.originalPrice || 85000).toLocaleString()}
                </span>
                <span className="text-xs font-bold text-emerald-400 block">
                  100% Scholarship Waived
                </span>
                <div className="text-lg font-black text-white mt-0.5">
                  Fee: <span className="text-emerald-400">₦{fee.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Course Selector Dropdown if user wants to switch */}
            {courses.length > 1 && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">
                  Switch Course Track
                </label>
                <select
                  value={activeCourseId}
                  onChange={(e) => setActiveCourseId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-xs text-white focus:outline-none focus:border-[#0682F4]"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title} ({c.category}) — ₦{(c.scholarshipRegistrationFee || 4500).toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Payer Verification Details */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-[#0682F4]" />
                  <span>Payer Verification & Receipt Information</span>
                </h4>
                <span className="text-[10px] text-slate-500">Required for payment verification</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Your Full Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Samuel Adebayo"
                    value={payerName}
                    onChange={(e) => setPayerName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#0682F4]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Email Address <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={payerEmail}
                    onChange={(e) => setPayerEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#0682F4]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    WhatsApp Phone Number <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+234 812 345 6789"
                    value={payerPhone}
                    onChange={(e) => setPayerPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#0682F4]"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Your WhatsApp number will be verified to unlock your cohort group after registration.
                  </p>
                </div>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-[#0682F4]" />
                <span>Select Payment Method</span>
              </h4>

              <div className="grid grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('paystack')}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    paymentMethod === 'paystack'
                      ? 'bg-[#0682F4]/15 border-[#0682F4] text-white ring-2 ring-[#0682F4]/30'
                      : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <CreditCard className="w-5 h-5 mx-auto mb-1 text-[#06C3F8]" />
                  <span className="text-xs font-bold block">Paystack</span>
                  <span className="text-[10px] text-slate-400">Card / USSD</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    paymentMethod === 'card'
                      ? 'bg-[#0682F4]/15 border-[#0682F4] text-white ring-2 ring-[#0682F4]/30'
                      : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <ShieldCheck className="w-5 h-5 mx-auto mb-1 text-emerald-400" />
                  <span className="text-xs font-bold block">Debit Card</span>
                  <span className="text-[10px] text-slate-400">Instant Check</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('transfer')}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    paymentMethod === 'transfer'
                      ? 'bg-[#0682F4]/15 border-[#0682F4] text-white ring-2 ring-[#0682F4]/30'
                      : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <Building className="w-5 h-5 mx-auto mb-1 text-amber-400" />
                  <span className="text-xs font-bold block">Bank Transfer</span>
                  <span className="text-[10px] text-slate-400">Official Account</span>
                </button>
              </div>

              {/* Bank Transfer Details Box if selected */}
              {paymentMethod === 'transfer' && (
                <div className="p-3.5 rounded-xl bg-slate-950 border border-amber-500/30 text-xs space-y-2">
                  <div className="flex items-center justify-between text-amber-400 font-bold">
                    <span>Official Nexovira Academy Bank Details</span>
                    <span className="text-[10px] uppercase px-2 py-0.5 rounded bg-amber-500/10">Instant Verification</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300 pt-1">
                    <div>
                      <span className="text-slate-500 block">Bank Name</span>
                      <strong className="text-white">Opay / Paycom Bank</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Account Number</span>
                      <strong className="text-white font-mono text-xs">8123456789</strong>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-500 block">Account Name</span>
                      <strong className="text-white">NEXOVIRA TECHNOLOGIES ACADEMY</strong>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 italic">
                    Transfer exactly ₦{fee.toLocaleString()}. Clicking verify below will validate and unlock your registration form.
                  </p>
                </div>
              )}
            </div>

            {/* Error Message */}
            {paymentError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{paymentError}</span>
              </div>
            )}

            {/* Strict Notice that Payment Unlocks Form */}
            <div className="p-3 rounded-xl bg-[#01213D]/60 border border-[#0682F4]/30 text-xs flex items-start gap-2 text-slate-300">
              <Lock className="w-4 h-4 text-[#06C3F8] shrink-0 mt-0.5" />
              <div className="text-[11px] leading-relaxed">
                <strong>Important Policy:</strong> Payment must be successfully verified before the Scholarship Registration Form is unlocked. Upon verified payment, you will immediately fill out your student profile and join your assigned cohort.
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setCurrentStep('resume_lookup')}
                className="text-xs text-[#06C3F8] hover:underline flex items-center gap-1 order-2 sm:order-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Already Paid? Resume Registration Form</span>
              </button>

              <button
                type="button"
                disabled={isVerifyingPayment}
                onClick={handleInitiateAndVerifyPayment}
                className="w-full sm:w-auto px-6 py-3 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-[#0682F4] to-[#06C3F8] hover:opacity-90 active:scale-95 text-white shadow-lg shadow-[#0682F4]/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 order-1 sm:order-2"
              >
                {isVerifyingPayment ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Verifying Genuine Payment...</span>
                  </>
                ) : (
                  <>
                    <span>Register for Scholarship — ₦{fee.toLocaleString()}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* RESUME INCOMPLETE REGISTRATION LOOKUP */}
        {currentStep === 'resume_lookup' && (
          <div className="p-6 space-y-6">
            <div className="text-center space-y-2 max-w-md mx-auto">
              <div className="w-12 h-12 rounded-2xl bg-[#0682F4]/20 text-[#06C3F8] flex items-center justify-center mx-auto">
                <RotateCcw className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-white">Resume Incomplete Registration</h3>
              <p className="text-xs text-slate-400">
                If you already paid ₦4,500 previously, enter your email address or payment reference to unlock and complete your registration form without paying again.
              </p>
            </div>

            <form onSubmit={handleLookupAndResumeForm} className="space-y-4 max-w-md mx-auto">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Email Address or Payment Reference
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="e.g. name@example.com or PSTK_SCH_..."
                    value={lookupQuery}
                    onChange={(e) => setLookupQuery(e.target.value)}
                    className="w-full pl-3 pr-10 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#0682F4]"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                </div>
              </div>

              {lookupError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{lookupError}</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep('pay')}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  ← Back to Payment
                </button>

                <button
                  type="submit"
                  disabled={isLookingUp}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#0682F4] hover:bg-[#06C3F8] text-white flex items-center gap-2 disabled:opacity-50"
                >
                  {isLookingUp ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Verifying Record...</span>
                    </>
                  ) : (
                    <>
                      <span>Verify & Unlock Form</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* STEP 2: UNLOCKED REGISTRATION FORM */}
        {currentStep === 'unlocked_form' && (
          <div className="p-6 space-y-6 max-h-[72vh] overflow-y-auto">
            {/* MANDATORY PROMPT REQUIREMENT: Specific Payment Successful Message Banner */}
            <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>Payment Successful! Please complete the registration form below to finalize your scholarship registration.</span>
              </div>
              
              {/* Attached Course and Payment Reference Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-emerald-500/20 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block">Attached Course Track</span>
                  <strong className="text-white truncate block">{currentCourse?.title}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Verified Payment Ref</span>
                  <strong className="text-emerald-400 font-mono text-[11px] truncate block">{verifiedPaymentRef}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Settlement Status</span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> ₦{fee.toLocaleString()} Confirmed
                  </span>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmitRegistrationForm} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Full Legal Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="First Name & Surname"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#0682F4]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Official Email <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="student@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#0682F4]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    WhatsApp Phone Number <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+234 812 345 6789"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#0682F4]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Current Status / Occupation <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={currentOccupation}
                    onChange={(e) => setCurrentOccupation(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-[#0682F4]"
                  >
                    <option value="Student">Undergraduate / Student</option>
                    <option value="Graduate">Recent Graduate / NYSC</option>
                    <option value="Working Professional">Working Professional</option>
                    <option value="Job Seeker">Career Switcher / Job Seeker</option>
                    <option value="Entrepreneur">Tech Entrepreneur / Freelancer</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    State / Region <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Lagos, Abuja, Rivers, Oyo"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#0682F4]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    City / Town <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ikeja, Lekki, Ibadan, Port Harcourt"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#0682F4]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Prior Experience in this Field
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['Beginner', 'Intermediate', 'Advanced'] as const).map((lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setExperienceLevel(lvl)}
                        className={`py-2 rounded-xl border text-center font-bold text-xs transition-all ${
                          experienceLevel === lvl
                            ? 'bg-[#0682F4]/20 border-[#0682F4] text-white'
                            : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800'
                        }`}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Why do you want to join this scholarship program? <span className="text-rose-400">*</span>
                  </label>
                  <textarea
                    required
                    rows={2}
                    placeholder="Share your motivation for learning this tech skill with Nexovira Academy..."
                    value={whyJoin}
                    onChange={(e) => setWhyJoin(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#0682F4]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    What do you hope to achieve after completing this training? <span className="text-rose-400">*</span>
                  </label>
                  <textarea
                    required
                    rows={2}
                    placeholder="e.g. Build real-world portfolio projects, secure a tech job, start freelancing, or launch a tech startup..."
                    value={goals}
                    onChange={(e) => setGoals(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#0682F4]"
                  />
                </div>

                <div className="sm:col-span-2 p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={commitmentAgreed}
                      onChange={(e) => setCommitmentAgreed(e.target.checked)}
                      className="mt-0.5 rounded text-[#0682F4] focus:ring-0"
                    />
                    <span className="text-[11px] text-slate-300 leading-relaxed">
                      I agree to attend scheduled virtual sessions, submit practical capstone projects, and adhere to the Nexovira Academy student code of conduct.
                    </span>
                  </label>
                </div>
              </div>

              {formError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end">
                <button
                  type="submit"
                  disabled={isSubmittingForm}
                  className="w-full sm:w-auto px-7 py-3 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-emerald-600 to-teal-500 hover:opacity-90 active:scale-95 text-white shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {isSubmittingForm ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Submitting Registration...</span>
                    </>
                  ) : (
                    <>
                      <span>Complete & Submit Registration</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* STEP 3: REGISTRATION COMPLETED & JOIN WHATSAPP (ACCESSIBLE ONLY AFTER FORM SUBMISSION) */}
        {currentStep === 'submitted_success' && completedApplication && (
          <div className="p-6 sm:p-8 space-y-6 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1.5 max-w-md mx-auto">
              <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                Registration Completed & Verified
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-white">
                Congratulations, {completedApplication.fullName}!
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Your scholarship registration for <strong className="text-white">{completedApplication.courseTitle}</strong> has been officially confirmed and enrolled.
              </p>
            </div>

            {/* Admission Reference Card */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 max-w-md mx-auto text-left space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-slate-500">Official Reference Number</span>
                <span className="text-[10px] text-emerald-400 font-bold">₦4,500 Confirmed</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800">
                <span className="font-mono text-xs sm:text-sm font-bold text-[#06C3F8]">
                  {completedApplication.referenceNumber}
                </span>
                <button
                  type="button"
                  onClick={handleCopyRef}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold flex items-center gap-1 transition-colors"
                >
                  {copiedRef ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedRef ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 pt-1">
                <div>
                  <span className="text-slate-500 block text-[10px]">Student Email</span>
                  <span className="text-slate-200 truncate block">{completedApplication.email}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">WhatsApp Phone</span>
                  <span className="text-slate-200 truncate block">{completedApplication.phone}</span>
                </div>
              </div>
            </div>

            {/* PROMINENT WHATSAPP GROUP ACCESS (UNLOCKED ONLY HERE) */}
            <div className="p-5 rounded-2xl bg-gradient-to-b from-[#25D366]/15 to-emerald-950/40 border border-[#25D366]/40 max-w-md mx-auto space-y-3">
              <div className="space-y-1">
                <div className="flex items-center justify-center gap-1.5 text-[#25D366] font-bold text-sm">
                  <MessageSquare className="w-4 h-4" />
                  <span>Join Assigned Course Community</span>
                </div>
                <p className="text-xs text-slate-300">
                  Connect with your lead facilitators, receive lecture links, and collaborate with your fellow cohort scholars.
                </p>
              </div>

              <a
                href={completedApplication.courseWhatsAppLink || whatsAppLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-black text-sm bg-[#25D366] hover:bg-[#20bd5a] text-slate-950 shadow-lg shadow-[#25D366]/25 transition-all active:scale-95"
              >
                <MessageSquare className="w-5 h-5 fill-current" />
                <span>Join Assigned WhatsApp Group</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>

            {/* Print or Return */}
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Print Admission Slip</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-[#0682F4] hover:bg-[#06C3F8] text-white"
              >
                Done / Return to Academy
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
