import React, { useState } from 'react';
import { 
  X, 
  Save, 
  GraduationCap, 
  Sparkles, 
  MessageSquare, 
  Image as ImageIcon, 
  User, 
  Calendar, 
  Layers, 
  DollarSign, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import { Course } from '../types';
import { saveOfficialCourseToFirestore } from '../lib/firestoreService';
import { ImageUploadField } from './ImageUploadField';

interface CourseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseToEdit?: Course | null;
  onSaved: (course: Course) => void;
  userRole?: string;
}

export const CourseFormModal: React.FC<CourseFormModalProps> = ({
  isOpen,
  onClose,
  courseToEdit,
  onSaved,
  userRole
}) => {
  const [title, setTitle] = useState(courseToEdit?.title || '');
  const [category, setCategory] = useState(courseToEdit?.category || 'Engineering & Code');
  const [instructor, setInstructor] = useState(courseToEdit?.instructor || '');
  const [instructorTitle, setInstructorTitle] = useState(courseToEdit?.instructorTitle || 'Senior Technology Facilitator');
  const [instructorAvatar, setInstructorAvatar] = useState(
    courseToEdit?.instructorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
  );
  const [durationWeeks, setDurationWeeks] = useState(courseToEdit?.durationWeeks || '8 Weeks');
  const [skillLevel, setSkillLevel] = useState<'Beginner' | 'Intermediate' | 'Advanced' | 'All Levels'>(
    courseToEdit?.skillLevel || 'Beginner'
  );
  const [originalPrice, setOriginalPrice] = useState<number>(courseToEdit?.originalPrice || 85000);
  const [registrationFee, setRegistrationFee] = useState<number>(courseToEdit?.scholarshipRegistrationFee || 4500);
  const [availableSlots, setAvailableSlots] = useState<number>(courseToEdit?.availableSlots || 60);
  const [enrolledSlots, setEnrolledSlots] = useState<number>(courseToEdit?.enrolledSlots || 0);
  const [scholarshipStatus, setScholarshipStatus] = useState<'Open' | 'Limited Slots' | 'Closing Soon' | 'Closed'>(
    courseToEdit?.scholarshipStatus || 'Open'
  );
  const [published, setPublished] = useState<boolean>(courseToEdit ? (courseToEdit.published ?? true) : true);
  const [thumbnail, setThumbnail] = useState(
    courseToEdit?.thumbnail || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80'
  );
  const [whatsAppGroupLink, setWhatsAppGroupLink] = useState(
    courseToEdit?.whatsAppGroupLink || ''
  );
  const [description, setDescription] = useState(courseToEdit?.description || '');
  const [learningOutcomesText, setLearningOutcomesText] = useState(
    courseToEdit?.learningOutcomes ? courseToEdit.learningOutcomes.join('\n') : ''
  );
  const [requirementsText, setRequirementsText] = useState(
    courseToEdit?.requirements ? courseToEdit.requirements.join('\n') : 'Laptop or smartphone with internet connection\nDedication to attend virtual sessions and complete assignments'
  );

  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isThumbnailUploading, setIsThumbnailUploading] = useState(false);
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isThumbnailUploading || isAvatarUploading) {
      setErrorMessage('Please wait for the image upload to complete before saving.');
      return;
    }
    if (!title.trim()) {
      setErrorMessage('Course title is required');
      return;
    }
    if (!instructor.trim()) {
      setErrorMessage('Instructor / Facilitator name is required');
      return;
    }
    if (!description.trim()) {
      setErrorMessage('Short course description is required');
      return;
    }
    if (!thumbnail.trim()) {
      setErrorMessage('Course thumbnail image is required');
      return;
    }

    setIsSaving(true);
    setErrorMessage('');

    try {
      const courseId = courseToEdit?.id || `course-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      
      const learningOutcomes = learningOutcomesText
        .split('\n')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      const requirements = requirementsText
        .split('\n')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      const cleanThumbnail = thumbnail.trim();
      const cleanDuration = durationWeeks.trim();
      const cleanWhatsApp = whatsAppGroupLink.trim() || `https://chat.whatsapp.com/invite/Nexovira${courseId}`;
      const nowIso = new Date().toISOString();

      const updatedCourse: Course = {
        id: courseId,
        title: title.trim(),
        category: category.trim(),
        instructor: instructor.trim(),
        instructorAvatar: instructorAvatar.trim(),
        instructorTitle: instructorTitle.trim(),
        price: registrationFee,
        registration_fee: registrationFee,
        scholarshipRegistrationFee: registrationFee,
        originalPrice: originalPrice,
        priceType: 'paid',
        currency: 'NGN',
        rating: courseToEdit?.rating || 4.9,
        reviewCount: courseToEdit?.reviewCount || 10,
        studentCount: courseToEdit?.studentCount || enrolledSlots,
        lessonsCount: courseToEdit?.lessonsCount || 24,
        totalHours: `${cleanDuration}`,
        duration: cleanDuration,
        durationWeeks: cleanDuration,
        thumbnail: cleanThumbnail,
        image_url: cleanThumbnail,
        description: description.trim(),
        learningOutcomes: learningOutcomes.length > 0 ? learningOutcomes : ['Hands-on practical industry projects'],
        learning_outcomes: learningOutcomes.length > 0 ? learningOutcomes : ['Hands-on practical industry projects'],
        requirements: requirements,
        modules: courseToEdit?.modules || [],
        certificateAvailable: true,
        published: published,
        status: published ? 'published' : 'draft',
        isScholarshipCourse: true,
        skillLevel: skillLevel,
        availableSlots: availableSlots,
        enrolledSlots: enrolledSlots,
        scholarshipStatus: scholarshipStatus,
        whatsAppGroupLink: cleanWhatsApp,
        WhatsApp_group_link: cleanWhatsApp,
        createdAt: courseToEdit?.createdAt || courseToEdit?.created_at || nowIso,
        created_at: courseToEdit?.created_at || courseToEdit?.createdAt || nowIso,
        updatedAt: nowIso,
        updated_at: nowIso
      };

      await saveOfficialCourseToFirestore(updatedCourse, userRole);
      onSaved(updatedCourse);
      onClose();
    } catch (err: any) {
      console.error('Failed to save course to Firestore:', err);
      setErrorMessage(`Database save failed: ${err?.message || 'Could not sync to cloud'}. All your entered information has been preserved so you can retry.`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden my-6 text-slate-100 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#01213D] via-[#0682F4] to-[#06C3F8] flex items-center justify-center text-white shadow-md">
              <GraduationCap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">
                {courseToEdit ? 'Edit Academy Course' : 'Create New Academy Course'}
              </h3>
              <p className="text-xs text-slate-400">Manage course parameters, fees, and WhatsApp community link</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Basic Details */}
          <div className="space-y-3">
            <div>
              <label className="font-semibold text-slate-300 block mb-1">Course Title *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. UI/UX Design Masterclass"
                className="w-full px-3 py-2 bg-slate-800/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-[#0682F4]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-300 block mb-1">Category *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800/90 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-[#0682F4]"
                >
                  <option value="Engineering & Code">Engineering & Code</option>
                  <option value="Design & Creative">Design & Creative</option>
                  <option value="Cloud & Infrastructure">Cloud & Infrastructure</option>
                  <option value="Security & Systems">Security & Systems</option>
                  <option value="Data & Analytics">Data & Analytics</option>
                  <option value="Artificial Intelligence">Artificial Intelligence</option>
                  <option value="Marketing & Sales">Marketing & Sales</option>
                  <option value="Content & Media">Content & Media</option>
                  <option value="Product & Leadership">Product & Leadership</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Duration *</label>
                <input
                  type="text"
                  required
                  value={durationWeeks}
                  onChange={(e) => setDurationWeeks(e.target.value)}
                  placeholder="e.g. 8 Weeks, 10 Weeks"
                  className="w-full px-3 py-2 bg-slate-800/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-[#0682F4]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-300 block mb-1">Instructor / Facilitator Name *</label>
                <input
                  type="text"
                  required
                  value={instructor}
                  onChange={(e) => setInstructor(e.target.value)}
                  placeholder="e.g. Amina Bello"
                  className="w-full px-3 py-2 bg-slate-800/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-[#0682F4]"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Instructor Title</label>
                <input
                  type="text"
                  value={instructorTitle}
                  onChange={(e) => setInstructorTitle(e.target.value)}
                  placeholder="e.g. Lead Product Designer"
                  className="w-full px-3 py-2 bg-slate-800/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-[#0682F4]"
                />
              </div>
            </div>

            <div>
              <ImageUploadField
                value={instructorAvatar}
                onChange={setInstructorAvatar}
                onUploadStateChange={setIsAvatarUploading}
                label="Instructor / Facilitator Avatar Photo"
                helperText="Upload instructor headshot photo (square 1:1). JPG, PNG, WebP."
                folder="courses/instructors"
                aspectRatio="square"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="font-semibold text-slate-300 block mb-1">Original Price (₦)</label>
                <input
                  type="number"
                  value={originalPrice}
                  onChange={(e) => setOriginalPrice(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-800/90 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-[#0682F4]"
                />
              </div>

              <div>
                <label className="font-semibold text-emerald-400 block mb-1">Scholarship Fee (₦) *</label>
                <input
                  type="number"
                  required
                  value={registrationFee}
                  onChange={(e) => setRegistrationFee(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-800/90 border border-slate-700 rounded-xl text-emerald-400 font-bold focus:outline-none focus:border-[#0682F4]"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Skill Level</label>
                <select
                  value={skillLevel}
                  onChange={(e) => setSkillLevel(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-800/90 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-[#0682F4]"
                >
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                  <option value="All Levels">All Levels</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="font-semibold text-slate-300 block mb-1">Available Slots</label>
                <input
                  type="number"
                  value={availableSlots}
                  onChange={(e) => setAvailableSlots(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-800/90 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-[#0682F4]"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Enrolled Slots</label>
                <input
                  type="number"
                  value={enrolledSlots}
                  onChange={(e) => setEnrolledSlots(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-800/90 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-[#0682F4]"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Scholarship Status</label>
                <select
                  value={scholarshipStatus}
                  onChange={(e) => setScholarshipStatus(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-800/90 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-[#0682F4]"
                >
                  <option value="Open">Open</option>
                  <option value="Limited Slots">Limited Slots</option>
                  <option value="Closing Soon">Closing Soon</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>
            </div>

            {/* Critical Field: WhatsApp Group Link */}
            <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-800/40 space-y-1">
              <label className="font-bold text-emerald-400 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Assigned WhatsApp Group Link * (Applicants auto-redirect here upon payment)</span>
              </label>
              <input
                type="url"
                required
                value={whatsAppGroupLink}
                onChange={(e) => setWhatsAppGroupLink(e.target.value)}
                placeholder="https://chat.whatsapp.com/invite/..."
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-emerald-300 placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono text-xs"
              />
              <p className="text-[10px] text-slate-400">
                Each course should have its dedicated WhatsApp group so students can meet instructors directly.
              </p>
            </div>

            <div>
              <ImageUploadField
                value={thumbnail}
                onChange={setThumbnail}
                onUploadStateChange={setIsThumbnailUploading}
                label="Course Thumbnail / Cover Image"
                helperText="Upload course cover card (16:9 recommended). JPG, PNG, WebP."
                folder="courses/thumbnails"
                aspectRatio="video"
                required
              />
            </div>

            <div>
              <label className="font-semibold text-slate-300 block mb-1">Course Overview & Description *</label>
              <textarea
                rows={3}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What this course covers and how it prepares students for the industry..."
                className="w-full px-3 py-2 bg-slate-800/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-[#0682F4]"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-300 block mb-1">
                What Students Will Learn (One outcome per line)
              </label>
              <textarea
                rows={3}
                value={learningOutcomesText}
                onChange={(e) => setLearningOutcomesText(e.target.value)}
                placeholder="Master core tools and workflows&#10;Build 2 industry portfolio case studies&#10;Learn developer handoff & collaboration"
                className="w-full px-3 py-2 bg-slate-800/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-[#0682F4]"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-300 block mb-1">
                Requirements (One per line)
              </label>
              <textarea
                rows={2}
                value={requirementsText}
                onChange={(e) => setRequirementsText(e.target.value)}
                placeholder="Laptop or PC&#10;Eagerness to practice 5-8 hours weekly"
                className="w-full px-3 py-2 bg-slate-800/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-[#0682F4]"
              />
            </div>

            {/* Visibility Toggle */}
            <div className="pt-2 flex items-center justify-between p-3 rounded-xl bg-slate-800/50 border border-slate-700/60">
              <div>
                <span className="font-bold text-white block">Course Visibility</span>
                <span className="text-[11px] text-slate-400">
                  {published ? 'Published (visible to all students on the website)' : 'Draft (hidden from public catalog)'}
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={published}
                  onChange={(e) => setPublished(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0682F4]"></div>
              </label>
            </div>
          </div>

          {/* Footer Controls */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold bg-gradient-to-r from-[#0682F4] to-[#06C3F8] hover:opacity-90 disabled:opacity-50 text-white shadow-md transition-all active:scale-95"
            >
              {isSaving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving to Database...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Course</span>
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
