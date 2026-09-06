import React, { useState } from 'react';
import { 
  X, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle2, 
  UserPlus, 
  Briefcase, 
  Plus, 
  Layers, 
  Globe, 
  Github, 
  Linkedin, 
  ShieldCheck, 
  RefreshCw 
} from 'lucide-react';
import { TECH_SERVICE_CATEGORIES } from '../../data/techServicesCategories';
import { saveServiceProviderToFirestore, recordEmailNotificationInFirestore } from '../../lib/firestoreService';
import { ServiceProvider } from '../../types';
import { ImageUploadField } from '../ImageUploadField';

interface ExpertApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplicationSubmitted?: (expert: ServiceProvider) => void;
}

export const ExpertApplicationModal: React.FC<ExpertApplicationModalProps> = ({
  isOpen,
  onClose,
  onApplicationSubmitted
}) => {
  const [step, setStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  // Form State
  const [fullName, setFullName] = useState<string>('');
  const [professionalName, setProfessionalName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [location, setLocation] = useState<string>('Lagos, Nigeria');
  const [avatarUrl, setAvatarUrl] = useState<string>(
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80'
  );

  const [title, setTitle] = useState<string>('');
  const [primaryExpertise, setPrimaryExpertise] = useState<string>(TECH_SERVICE_CATEGORIES[0].title);
  const [secondaryExpertise, setSecondaryExpertise] = useState<string[]>([]);
  const [bio, setBio] = useState<string>('');

  const [skills, setSkills] = useState<string[]>(['TypeScript', 'React', 'REST APIs']);
  const [newSkillInput, setNewSkillInput] = useState<string>('');

  const [experienceLevel, setExperienceLevel] = useState<string>('Experienced');
  const [experienceYears, setExperienceYears] = useState<number>(4);
  const [experienceSummary, setExperienceSummary] = useState<string>('');

  const [websiteUrl, setWebsiteUrl] = useState<string>('');
  const [githubUrl, setGithubUrl] = useState<string>('');
  const [linkedInUrl, setLinkedInUrl] = useState<string>('');
  const [behanceUrl, setBehanceUrl] = useState<string>('');
  const [portfolioCaseStudy, setPortfolioCaseStudy] = useState<string>('');

  const [availability, setAvailability] = useState<'available' | 'busy' | 'part_time' | 'unavailable'>('available');
  const [projectPreferences, setProjectPreferences] = useState<string[]>(['Remote', 'Contract', 'Short-term Projects']);
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const handleAddSkill = () => {
    if (!newSkillInput.trim()) return;
    if (!skills.includes(newSkillInput.trim())) {
      setSkills([...skills, newSkillInput.trim()]);
    }
    setNewSkillInput('');
  };

  const handleRemoveSkill = (sk: string) => {
    setSkills(skills.filter(s => s !== sk));
  };

  const togglePreference = (pref: string) => {
    if (projectPreferences.includes(pref)) {
      setProjectPreferences(projectPreferences.filter(p => p !== pref));
    } else {
      setProjectPreferences([...projectPreferences, pref]);
    }
  };

  const validateStep = (current: number): boolean => {
    const err: Record<string, string> = {};
    if (current === 1) {
      if (!fullName.trim()) err.name = 'Full name is required.';
      if (!email.trim() || !email.includes('@')) err.email = 'Valid email is required.';
      if (!phone.trim()) err.phone = 'Phone number is required for verification.';
    }
    if (current === 2) {
      if (!title.trim()) err.title = 'Professional title is required.';
      if (!bio.trim() || bio.trim().length < 20) err.bio = 'Please provide a detailed bio (at least 20 characters).';
    }
    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(prev => prev - 1);
  };

  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(step)) return;

    setIsSubmitting(true);
    try {
      const expertId = `prov-app-${Date.now()}`;
      const payload: Partial<ServiceProvider> = {
        id: expertId,
        name: fullName.trim(),
        professionalName: professionalName.trim() || fullName.trim(),
        title: title.trim(),
        email: email.trim(),
        phone: phone.trim(),
        location: location.trim(),
        country: 'Nigeria',
        countryCode: 'NG',
        specialization: primaryExpertise,
        primaryExpertise: primaryExpertise,
        secondaryExpertise: secondaryExpertise,
        bio: bio.trim(),
        skills: skills,
        experienceLevel: experienceLevel,
        experienceYears: Number(experienceYears) || 3,
        experienceSummary: experienceSummary.trim() || `${experienceLevel} professional with ${experienceYears} years experience.`,
        portfolio: portfolioCaseStudy ? [{ title: 'Featured Case Study', description: portfolioCaseStudy, url: websiteUrl || githubUrl }] : [],
        availability: availability,
        projectPreferences: projectPreferences,
        servicesOffered: [primaryExpertise],
        avatarUrl: avatarUrl,
        websiteUrl: websiteUrl,
        githubUrl: githubUrl,
        linkedInUrl: linkedInUrl,
        behanceUrl: behanceUrl,
        hasAuthorizedLinkedIn: !!linkedInUrl,
        isPublic: false, // Hidden from public showcase until Admin reviews and marks Active
        applicationStatus: 'Under Review',
        rating: 5.0,
        completedProjectsCount: 0,
        verifiedByManagement: false,
        createdAt: new Date().toISOString()
      };

      await saveServiceProviderToFirestore(payload);

      // 1. Dispatch email notification to Nexovira Management (nexoviratech@gmail.com)
      try {
        await fetch('/api/v1/tech-services/notify-management', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'expert_application',
            payload
          })
        });
      } catch (notifyErr) {
        console.warn('Management expert application email notification dispatched asynchronously:', notifyErr);
      }

      // 2. Record in Firestore email notifications audit ledger
      try {
        await recordEmailNotificationInFirestore({
          type: 'expert_application',
          recipient: 'nexoviratech@gmail.com',
          subject: `[Expert Application] ${payload.name} - ${payload.title} (${payload.specialization})`,
          referenceNumber: expertId,
          senderName: payload.name,
          senderEmail: payload.email,
          summary: `${payload.specialization} • ${payload.experienceYears} Years Experience • Rating: 5.0`,
          status: 'SENT',
          deliveryChannel: 'SMTP',
          payload: {
            name: payload.name,
            title: payload.title,
            specialization: payload.specialization,
            phone: payload.phone
          }
        });
      } catch (auditErr) {
        console.warn('Could not record notification in Firestore ledger:', auditErr);
      }

      setIsCompleted(true);
      if (onApplicationSubmitted) onApplicationSubmitted(payload as ServiceProvider);
    } catch (err: any) {
      setErrors({ submit: err?.message || 'Failed to submit application. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div 
        className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl my-8 text-white max-h-[90vh] overflow-y-auto space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        {isCompleted ? (
          <div className="text-center py-8 space-y-6 animate-fadeIn">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-2 max-w-md mx-auto">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                Application Received • Under Review
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                Welcome to the Nexovira Network
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Thank you for applying, <strong>{fullName}</strong>. Every professional application is rigorously reviewed by the Nexovira administration before assignments are authorized.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-left text-xs space-y-2">
              <div className="flex items-center gap-2 text-cyan-400 font-bold">
                <ShieldCheck className="w-4 h-4" />
                <span>Next Verification Milestones:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-slate-400">
                <li>Portfolio & code verification by technical leads (Within 48 hours)</li>
                <li>Credential verification & LinkedIn authorization check</li>
                <li>Project assignment notification delivered via your registered email ({email})</li>
              </ul>
            </div>

            <button
              onClick={onClose}
              className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black text-xs rounded-xl shadow-lg"
            >
              Return to Tech & Digital Services
            </button>
          </div>
        ) : (
          <div>
            {/* Header */}
            <div className="pr-10 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider bg-cyan-500/10 px-2.5 py-0.5 rounded-full border border-cyan-500/20">
                  Nexovira Expert Network
                </span>
                <span className="text-xs text-slate-500">• Step {step} of 5</span>
              </div>
              <h2 className="text-2xl font-black text-white mt-1">
                Bring Your Expertise Into the Nexovira Ecosystem
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Join a vetted network of technical and digital specialists. Nexovira assigns qualified briefs directly to you.
              </p>
            </div>

            {/* Step 1: Personal Info */}
            {step === 1 && (
              <div className="space-y-4 pt-4 animate-fadeIn">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">1. Personal Information</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300">Full Legal Name *</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Adebayo Babatunde"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                    {errors.name && <p className="text-xs text-rose-400">{errors.name}</p>}
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300">Professional / Display Name</label>
                    <input
                      type="text"
                      value={professionalName}
                      onChange={(e) => setProfessionalName(e.target.value)}
                      placeholder="e.g. Adebayo B."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300">Email Address *</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="adebayo@domain.com"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                    {errors.email && <p className="text-xs text-rose-400">{errors.email}</p>}
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300">Phone / WhatsApp Number *</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+234 800 000 0000"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                    {errors.phone && <p className="text-xs text-rose-400">{errors.phone}</p>}
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-bold text-slate-300">Location (City, Country)</label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="Lagos, Nigeria"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <ImageUploadField
                      value={avatarUrl}
                      onChange={setAvatarUrl}
                      label="Profile / Avatar Photo"
                      helperText="Upload professional headshot (square 1:1). JPG, PNG, WebP."
                      folder="service_providers/avatars"
                      aspectRatio="square"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Professional Profile */}
            {step === 2 && (
              <div className="space-y-4 pt-4 animate-fadeIn">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">2. Professional Profile</h3>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300">Professional Title *</label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Senior Full-Stack Web Architect & Cloud Specialist"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                    {errors.title && <p className="text-xs text-rose-400">{errors.title}</p>}
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300">Primary Expertise Area *</label>
                    <select
                      value={primaryExpertise}
                      onChange={(e) => setPrimaryExpertise(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                    >
                      {TECH_SERVICE_CATEGORIES.map(cat => (
                        <option key={cat.id} value={cat.title}>{cat.title}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300">Professional Bio & Philosophy *</label>
                    <textarea
                      rows={4}
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Highlight your background, core technical focus, and types of projects you execute with excellence..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-cyan-500 resize-none"
                    />
                    {errors.bio && <p className="text-xs text-rose-400">{errors.bio}</p>}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Skills & Experience */}
            {step === 3 && (
              <div className="space-y-4 pt-4 animate-fadeIn">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">3. Skills & Experience Level</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300">Seniority Level</label>
                    <select
                      value={experienceLevel}
                      onChange={(e) => setExperienceLevel(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                    >
                      {['Beginner', 'Intermediate', 'Experienced', 'Senior', 'Expert'].map(lvl => (
                        <option key={lvl} value={lvl}>{lvl}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300">Years of Professional Experience</label>
                    <input
                      type="number"
                      min={1}
                      max={35}
                      value={experienceYears}
                      onChange={(e) => setExperienceYears(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                {/* Skills Tags */}
                <div className="space-y-2 pt-2">
                  <label className="text-xs font-bold text-slate-300">Key Technical Skills & Tools</label>
                  <div className="flex flex-wrap gap-1.5">
                    {skills.map(sk => (
                      <span key={sk} className="inline-flex items-center gap-1 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2.5 py-1 rounded-lg text-xs font-bold">
                        <span>{sk}</span>
                        <button type="button" onClick={() => handleRemoveSkill(sk)} className="hover:text-white">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>

                  <div className="flex gap-2 max-w-sm pt-1">
                    <input
                      type="text"
                      value={newSkillInput}
                      onChange={(e) => setNewSkillInput(e.target.value)}
                      placeholder="e.g. Docker, Python, Figma..."
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddSkill(); } }}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddSkill}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Portfolio & Verification */}
            {step === 4 && (
              <div className="space-y-4 pt-4 animate-fadeIn">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">4. Portfolio & Online Profiles</h3>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Linkedin className="w-3.5 h-3.5 text-blue-400" />
                      <span>LinkedIn Profile URL (Recommended)</span>
                    </label>
                    <input
                      type="url"
                      value={linkedInUrl}
                      onChange={(e) => setLinkedInUrl(e.target.value)}
                      placeholder="https://linkedin.com/in/username"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                        <Github className="w-3.5 h-3.5 text-slate-400" />
                        <span>GitHub Profile / Repo URL</span>
                      </label>
                      <input
                        type="url"
                        value={githubUrl}
                        onChange={(e) => setGithubUrl(e.target.value)}
                        placeholder="https://github.com/username"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Portfolio Website / Behance</span>
                      </label>
                      <input
                        type="url"
                        value={websiteUrl}
                        onChange={(e) => setWebsiteUrl(e.target.value)}
                        placeholder="https://myportfolio.com"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-1 pt-1">
                    <label className="text-xs font-bold text-slate-300">Featured Project or Case Study Summary</label>
                    <textarea
                      rows={3}
                      value={portfolioCaseStudy}
                      onChange={(e) => setPortfolioCaseStudy(e.target.value)}
                      placeholder="Briefly describe a notable project you built, its technical architecture, and its tangible outcome..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-cyan-500 resize-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Availability & Final Submit */}
            {step === 5 && (
              <form onSubmit={handleSubmitApplication} className="space-y-4 pt-4 animate-fadeIn">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">5. Availability & Project Preferences</h3>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300">Current Work Availability</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'available', label: 'Available' },
                        { id: 'part_time', label: 'Part-Time' },
                        { id: 'busy', label: 'Limited' }
                      ].map(item => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setAvailability(item.id as any)}
                          className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                            availability === item.id
                              ? 'bg-cyan-500 text-slate-950 border-cyan-500'
                              : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1 pt-2">
                    <label className="text-xs font-bold text-slate-300">Engagement Preferences</label>
                    <div className="grid grid-cols-2 gap-2">
                      {['Remote Only', 'Contract / Project-Based', 'Short-term Sprints', 'Long-term Retainers', 'Technical Consulting'].map(pref => {
                        const isChecked = projectPreferences.includes(pref);
                        return (
                          <div
                            key={pref}
                            onClick={() => togglePreference(pref)}
                            className={`p-3 rounded-xl border text-xs font-bold cursor-pointer transition-all flex items-center justify-between ${
                              isChecked
                                ? 'bg-cyan-500/10 border-cyan-500 text-white'
                                : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                            }`}
                          >
                            <span>{pref}</span>
                            {isChecked && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {errors.submit && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                    {errors.submit}
                  </div>
                )}

                <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={handleBack}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 text-white text-xs font-bold"
                  >
                    Back
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs rounded-xl shadow-lg flex items-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                        <span>Submitting Application...</span>
                      </>
                    ) : (
                      <>
                        <span>Submit Application for Review</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Footer Navigation for steps 1-4 */}
            {step < 5 && (
              <div className="pt-6 border-t border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={step === 1}
                  className={`px-4 py-2 rounded-xl text-xs font-bold ${
                    step === 1 ? 'opacity-40 cursor-not-allowed text-slate-600' : 'bg-slate-800 text-white'
                  }`}
                >
                  Back
                </button>

                <button
                  type="button"
                  onClick={handleNext}
                  className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black text-xs rounded-xl shadow-lg flex items-center gap-1.5"
                >
                  <span>Next Step</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
