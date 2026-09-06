import React, { useState, useEffect, useMemo } from 'react';
import { Course, CurrencyCode, CourseLesson, CourseEnrollment, ScholarshipApplication } from '../types';
import { 
  GraduationCap, 
  PlayCircle, 
  CheckCircle2, 
  Award, 
  Clock, 
  BookOpen, 
  X, 
  Download,
  Users,
  Lock,
  Sparkles,
  Send,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Edit,
  Plus,
  Search,
  Filter,
  MessageSquare,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Briefcase,
  Layers,
  ArrowRight,
  Check
} from 'lucide-react';
import { 
  getOfficialCoursesFromFirestore, 
  subscribeToOfficialCourses,
  getUserEnrollmentsFromFirestore, 
  deleteCourseFromFirestore,
  saveOfficialCourseToFirestore
} from '../lib/firestoreService';
import { useAuth } from '../context/AuthContext';
import { ScholarshipApplicationModal } from './ScholarshipApplicationModal';
import { CourseFormModal } from './CourseFormModal';

interface AcademyViewProps {
  currentCurrency: CurrencyCode;
}

export const AcademyView: React.FC<AcademyViewProps> = ({ currentCurrency }) => {
  const { user, userProfile, isAdmin } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<CourseEnrollment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Modals state
  const [selectedCourseForDetails, setSelectedCourseForDetails] = useState<Course | null>(null);
  const [selectedCourseForApplication, setSelectedCourseForApplication] = useState<Course | null>(null);
  const [isApplicationModalOpen, setIsApplicationModalOpen] = useState<boolean>(false);
  const [isCourseFormModalOpen, setIsCourseFormModalOpen] = useState<boolean>(false);
  const [courseToEdit, setCourseToEdit] = useState<Course | null>(null);
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);
  const [isDeletingCourse, setIsDeletingCourse] = useState<boolean>(false);
  const [showCertificateModal, setShowCertificateModal] = useState<Course | null>(null);

  // Active view tabs & filters
  const [activeTab, setActiveTab] = useState<'scholarship_catalog' | 'my_learning' | 'why_academy' | 'faqs'>('scholarship_catalog');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedLevel, setSelectedLevel] = useState<string>('All');

  // FAQ open states
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const loadAcademyData = async () => {
    setLoading(true);
    try {
      const data = await getOfficialCoursesFromFirestore(isAdmin);
      setCourses(data);

      if (user?.uid) {
        const enrList = await getUserEnrollmentsFromFirestore(user.uid);
        setEnrollments(enrList);
      }
    } catch (err) {
      console.error('Error loading Academy data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAcademyData();

    // Subscribe to real-time course updates from Firestore
    const unsubscribe = subscribeToOfficialCourses((liveCourses) => {
      setCourses(liveCourses);
    }, isAdmin);

    const handleCourseChanged = () => {
      loadAcademyData();
    };
    window.addEventListener('nexovira:courses-changed', handleCourseChanged);

    return () => {
      unsubscribe();
      window.removeEventListener('nexovira:courses-changed', handleCourseChanged);
    };
  }, [user?.uid, isAdmin]);

  // Categories extracted dynamically from courses
  const categories = useMemo(() => {
    const set = new Set<string>();
    courses.forEach(c => {
      if (c.category) set.add(c.category);
    });
    return ['All', ...Array.from(set)];
  }, [courses]);

  // Filtered courses
  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
      // If not admin, do not show unpublished
      if (!isAdmin && course.published === false && course.status !== 'published') {
        return false;
      }
      // Category filter
      if (selectedCategory !== 'All' && course.category !== selectedCategory) {
        return false;
      }
      // Level filter
      if (selectedLevel !== 'All' && course.skillLevel !== selectedLevel) {
        return false;
      }
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = course.title.toLowerCase().includes(q);
        const matchesDesc = course.description?.toLowerCase().includes(q);
        const matchesInstructor = course.instructor?.toLowerCase().includes(q);
        const matchesOutcomes = course.learningOutcomes?.some(o => o.toLowerCase().includes(q));
        if (!matchesTitle && !matchesDesc && !matchesInstructor && !matchesOutcomes) {
          return false;
        }
      }
      return true;
    });
  }, [courses, selectedCategory, selectedLevel, searchQuery, isAdmin]);

  const handleOpenApplication = (course: Course) => {
    setSelectedCourseForApplication(course);
    setIsApplicationModalOpen(true);
  };

  const handleOpenCourseDetails = (course: Course) => {
    setSelectedCourseForDetails(course);
  };

  const handleEditCourse = (course: Course) => {
    setCourseToEdit(course);
    setIsCourseFormModalOpen(true);
  };

  const handleCreateNewCourse = () => {
    setCourseToEdit(null);
    setIsCourseFormModalOpen(true);
  };

  const handleCourseSaved = (savedCourse: Course) => {
    setCourses((prev) => {
      const idx = prev.findIndex(c => c.id === savedCourse.id);
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = savedCourse;
        return next;
      }
      return [savedCourse, ...prev];
    });
  };

  const handleConfirmDeleteCourse = async () => {
    if (!courseToDelete) return;
    setIsDeletingCourse(true);
    try {
      const cid = courseToDelete.id;
      setCourses((prev) => prev.filter((c) => c.id !== cid));
      await deleteCourseFromFirestore(cid, userProfile?.role);
      setCourseToDelete(null);
    } catch (err) {
      console.error('Failed to delete course:', err);
      await loadAcademyData();
    } finally {
      setIsDeletingCourse(false);
    }
  };

  const handleTogglePublish = async (course: Course) => {
    try {
      const updated: Course = {
        ...course,
        published: !course.published,
        status: !course.published ? 'published' : 'draft',
        updatedAt: new Date().toISOString()
      };
      setCourses(prev => prev.map(c => c.id === course.id ? updated : c));
      await saveOfficialCourseToFirestore(updated, userProfile?.role);
    } catch (err) {
      console.error('Failed to toggle course visibility:', err);
      loadAcademyData();
    }
  };

  // Frequently Asked Questions
  const FAQS = [
    {
      q: 'What is the Nexovira Scholarship Program?',
      a: 'The Nexovira Scholarship Program is a special educational initiative designed to empower young professionals, students, and tech enthusiasts with high-demand digital skills. Under this program, 100% of standard tuition is subsidized, allowing accepted candidates to register for just ₦4,500.'
    },
    {
      q: 'What does the ₦4,500 registration fee cover?',
      a: 'The ₦4,500 fee is a one-time administrative and lab setup fee. It covers candidate profile verification, course portal access, cloud server sandboxes, learning materials, and entry into the dedicated WhatsApp facilitator community.'
    },
    {
      q: 'How do I join the class community on WhatsApp?',
      a: 'Immediately upon completing your subsidized registration payment, the system provides your unique admission reference number and a direct button to join your assigned course WhatsApp group. Facilitators, project milestones, and live class links are distributed through this group.'
    },
    {
      q: 'Are the sessions live or recorded?',
      a: 'Training consists of interactive live virtual masterclasses with industry mentors, complemented by recorded lecture replays and guided practical assignments that fit into your weekly schedule.'
    },
    {
      q: 'Will I receive a verified certificate upon completion?',
      a: 'Yes! Every student who attends sessions and submits their capstone portfolio project will receive an official verifiable Nexovira Academy Certificate of Achievement.'
    },
    {
      q: 'Can I apply for more than one scholarship track?',
      a: 'Yes, but we recommend applying for one course at a time so that you can fully commit the required hours to master the curriculum and complete the projects.'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-left space-y-8">
      
      {/* 1. ACADEMY HERO & SCHOLARSHIP ANNOUNCEMENT BANNER */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#01213D] via-[#07172C] to-slate-950 border border-[#0682F4]/40 shadow-2xl p-6 sm:p-10 text-white">
        
        {/* Glow ambient decoration */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#0682F4]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-[#06C3F8]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-4 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0682F4]/20 border border-[#06C3F8]/40 text-[#06C3F8] text-xs font-bold tracking-wide">
            <GraduationCap className="w-4 h-4 text-[#06C3F8]" />
            <span>NEXOVIRA ACADEMY • EMPOWERING FUTURE BUILDERS</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
            NEXOVIRA ACADEMY
          </h1>

          <p className="text-sm sm:text-base text-slate-300 font-medium leading-relaxed">
            Empowering the next generation through accessible technology education, practical skills, and opportunities to build the future.
          </p>

          {/* Prominent Scholarship Box */}
          <div className="mt-4 p-5 rounded-2xl bg-slate-900/90 border border-[#0682F4]/50 shadow-inner space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">🎓</span>
                <h2 className="text-lg sm:text-xl font-black text-white">
                  NEXOVIRA SCHOLARSHIP PROGRAM
                </h2>
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                Registration Open • ₦4,500 Fee
              </span>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Access selected technology courses through the Nexovira Scholarship Program and begin your journey into high-demand digital skills.
            </p>

            {/* Key Pillars Highlights */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800 text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#06C3F8] shrink-0" />
                <span>Hands-on Practical Labs</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#06C3F8] shrink-0" />
                <span>Industry Mentorship</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#06C3F8] shrink-0" />
                <span>Verified Certificate</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#06C3F8] shrink-0" />
                <span>WhatsApp Community</span>
              </div>
            </div>
          </div>

          {/* Admin Control Bar if Admin */}
          {isAdmin && (
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                onClick={handleCreateNewCourse}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-[#0682F4] hover:bg-[#05A9F7] text-white shadow-md transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Add New Course (Admin)</span>
              </button>
              <div className="text-xs text-amber-300 bg-amber-950/40 border border-amber-800/60 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                <span>Admin Privileges Active: You can add, edit, or hide courses anytime.</span>
              </div>
            </div>
          )}
        </div>

        {/* View Switcher Tabs */}
        <div className="mt-8 flex flex-wrap items-center gap-2 border-t border-slate-800/80 pt-4">
          <button
            onClick={() => setActiveTab('scholarship_catalog')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'scholarship_catalog'
                ? 'bg-gradient-to-r from-[#0682F4] to-[#06C3F8] text-white shadow-lg'
                : 'bg-slate-900/80 text-slate-300 hover:text-white border border-slate-800'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>Scholarship Courses ({courses.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('why_academy')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'why_academy'
                ? 'bg-gradient-to-r from-[#0682F4] to-[#06C3F8] text-white shadow-lg'
                : 'bg-slate-900/80 text-slate-300 hover:text-white border border-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Why Nexovira Academy</span>
          </button>

          <button
            onClick={() => setActiveTab('faqs')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'faqs'
                ? 'bg-gradient-to-r from-[#0682F4] to-[#06C3F8] text-white shadow-lg'
                : 'bg-slate-900/80 text-slate-300 hover:text-white border border-slate-800'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>Scholarship FAQs</span>
          </button>

          {user && enrollments.length > 0 && (
            <button
              onClick={() => setActiveTab('my_learning')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'my_learning'
                  ? 'bg-gradient-to-r from-[#0682F4] to-[#06C3F8] text-white shadow-lg'
                  : 'bg-slate-900/80 text-slate-300 hover:text-white border border-slate-800'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>My Enrolled Courses ({enrollments.length})</span>
            </button>
          )}
        </div>

      </div>

      {/* 2. MAIN CONTENT SECTIONS BASED ON ACTIVE TAB */}

      {/* TAB A: SCHOLARSHIP CATALOG */}
      {activeTab === 'scholarship_catalog' && (
        <div className="space-y-6">

          {/* Search & Category Filter Toolbar */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search input */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by course title, skill, or facilitator..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border border-transparent dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#0682F4]"
                />
              </div>

              {/* Skill level filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500 shrink-0">Level:</span>
                <select
                  value={selectedLevel}
                  onChange={(e) => setSelectedLevel(e.target.value)}
                  className="bg-slate-100 dark:bg-slate-800 border border-transparent dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#0682F4]"
                >
                  <option value="All">All Skill Levels</option>
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                  <option value="All Levels">All Levels</option>
                </select>
              </div>
            </div>

            {/* Category pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <span className="text-[11px] font-bold text-slate-400 shrink-0 pr-1 flex items-center gap-1">
                <Filter className="w-3 h-3" /> Category:
              </span>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-colors font-semibold ${
                    selectedCategory === cat
                      ? 'bg-[#0682F4] text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Resume Notice */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-2xl bg-gradient-to-r from-slate-900 to-[#01213D] border border-[#0682F4]/30 shadow-sm text-xs">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-[#0682F4]/20 text-[#06C3F8]">
                <ShieldCheck className="w-4 h-4" />
              </span>
              <div>
                <strong className="text-white block font-bold">Already paid your ₦4,500 scholarship registration?</strong>
                <span className="text-slate-300 text-[11px]">Your payment unlocks the registration form. Return anytime with your email or reference to submit.</span>
              </div>
            </div>
            {courses.length > 0 && (
              <button
                type="button"
                onClick={() => handleOpenApplication(courses[0])}
                className="shrink-0 px-3.5 py-1.5 rounded-xl bg-[#0682F4] hover:bg-[#05A9F7] text-white font-bold text-xs shadow transition-all active:scale-95"
              >
                Resume Form →
              </button>
            )}
          </div>

          {/* Loading Indicator */}
          {loading && (
            <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-[#0682F4]" />
              <span className="text-xs">Loading Nexovira Scholarship tracks...</span>
            </div>
          )}

          {/* Empty Search Result */}
          {!loading && filteredCourses.length === 0 && (
            <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
              <BookOpen className="w-10 h-10 text-slate-400 mx-auto" />
              <h3 className="text-base font-bold text-slate-800 dark:text-white">No courses match your criteria</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Try clearing your search query or selecting a different category filter.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('All');
                  setSelectedLevel('All');
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#0682F4] text-white shadow"
              >
                Reset Filters
              </button>
            </div>
          )}

          {/* Quick Resume Incomplete Registration Banner */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#01213D] via-slate-900 to-[#01213D] border border-[#0682F4]/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#0682F4]/20 text-[#06C3F8] flex items-center justify-center shrink-0 border border-[#0682F4]/30">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="text-xs">
                <strong className="text-white block text-sm">Already paid for a scholarship track?</strong>
                <span className="text-slate-300 text-[11px]">
                  Flow: Select Course → Pay ₦4,500 → Payment Verified → Unlock Registration Form → Submit & Join WhatsApp
                </span>
              </div>
            </div>

            {filteredCourses.length > 0 && (
              <button
                type="button"
                onClick={() => handleOpenApplication(filteredCourses[0])}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#0682F4] to-[#06C3F8] text-white font-bold text-xs shrink-0 flex items-center gap-1.5 shadow transition-all active:scale-95"
              >
                <span>Resume Registration Form</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* COURSE CARDS GRID */}
          {!loading && filteredCourses.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCourses.map((course) => {
                const regFee = course.scholarshipRegistrationFee || 4500;
                const origPrice = course.originalPrice || 85000;
                const isEnrolled = enrollments.some(e => e.courseId === course.id);

                return (
                  <div
                    key={course.id}
                    className="flex flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all duration-200 overflow-hidden group"
                  >
                    {/* Course Thumbnail Image */}
                    <div className="relative h-48 w-full overflow-hidden bg-slate-950">
                      <img
                        src={course.thumbnail}
                        alt={course.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                      
                      {/* Top Badges */}
                      <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-950/80 text-white backdrop-blur-sm border border-slate-700/60">
                          {course.category}
                        </span>
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full backdrop-blur-sm ${
                          course.scholarshipStatus === 'Limited Slots'
                            ? 'bg-amber-500/90 text-slate-950'
                            : course.scholarshipStatus === 'Closed'
                            ? 'bg-rose-500/90 text-white'
                            : 'bg-emerald-500/90 text-white'
                        }`}>
                          {course.scholarshipStatus || 'Scholarship Open'}
                        </span>
                      </div>

                      {/* Bottom Info on Image */}
                      <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-white text-[11px]">
                        <span className="flex items-center gap-1 font-medium bg-slate-900/80 px-2 py-0.5 rounded backdrop-blur-sm">
                          <Clock className="w-3 h-3 text-[#06C3F8]" />
                          {course.durationWeeks || course.totalHours || '8 Weeks'}
                        </span>
                        <span className="font-semibold bg-[#0682F4]/90 px-2 py-0.5 rounded text-white backdrop-blur-sm">
                          {course.skillLevel || 'Beginner'}
                        </span>
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div className="space-y-2">
                        <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-[#0682F4] transition-colors line-clamp-1">
                          {course.title}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                          {course.description}
                        </p>

                        {/* Facilitator info */}
                        <div className="flex items-center gap-2 pt-1">
                          <img
                            src={course.instructorAvatar}
                            alt={course.instructor}
                            className="w-6 h-6 rounded-full object-cover border border-slate-300 dark:border-slate-700"
                          />
                          <div className="truncate">
                            <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block truncate">
                              {course.instructor}
                            </span>
                            <span className="text-[10px] text-slate-400 block truncate">
                              {course.instructorTitle || 'Technology Mentor'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Pricing & Actions Box */}
                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-[10px] text-slate-400 block line-through">
                              Tuition: ₦{origPrice.toLocaleString()}
                            </span>
                            <div className="flex items-baseline gap-1">
                              <span className="text-xs font-bold text-slate-400">Reg Fee:</span>
                              <span className="text-base font-black text-emerald-500 dark:text-emerald-400">
                                ₦{regFee.toLocaleString()}
                              </span>
                            </div>
                          </div>

                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                            100% Tuition Waived
                          </span>
                        </div>

                        {/* Action Buttons */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenCourseDetails(course)}
                            className="w-full py-2.5 px-3 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                          >
                            View Syllabus
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenApplication(course)}
                            className="w-full py-2.5 px-3 rounded-xl text-xs font-bold bg-gradient-to-r from-[#0682F4] to-[#06C3F8] hover:opacity-90 text-white shadow-sm transition-all active:scale-95 flex items-center justify-center gap-1"
                          >
                            <span>{isEnrolled ? 'Enrolled' : `Register for Scholarship — ₦${regFee.toLocaleString()}`}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Admin Inline Action Controls */}
                        {isAdmin && (
                          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
                            <button
                              onClick={() => handleTogglePublish(course)}
                              className={`font-semibold hover:underline ${course.published ? 'text-amber-500' : 'text-emerald-500'}`}
                            >
                              {course.published ? 'Hide (Unpublish)' : 'Publish Course'}
                            </button>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleEditCourse(course)}
                                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800"
                                title="Edit Course"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setCourseToDelete(course)}
                                className="text-rose-400 hover:text-rose-300 p-1 rounded hover:bg-rose-900/30"
                                title="Delete Course"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* TAB B: WHY NEXOVIRA ACADEMY */}
      {activeTab === 'why_academy' && (
        <div className="space-y-6">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              Why Learn With Nexovira Academy?
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              We bridge the gap between academic theory and real-world tech industry demands.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-[#0682F4]/15 text-[#06C3F8] flex items-center justify-center font-bold">
                <Briefcase className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Industry-Standard Projects</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Build real-world applications, case studies, and business workflows you can immediately display in your professional portfolio to land jobs and freelance contracts.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center font-bold">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Vetted Senior Mentors</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Learn directly from practicing engineers, designers, AI architects, and marketing managers who solve high-scale tech challenges daily.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center font-bold">
                <MessageSquare className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Active WhatsApp Communities</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Connect with course cohorts, share project feedback, ask questions directly to facilitators, and form lifelong peer collaborations.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center font-bold">
                <Award className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Verifiable Credentials</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Receive an encrypted, verifiable Certificate of Achievement upon successful completion of your training and final capstone project.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-sky-500/15 text-sky-400 flex items-center justify-center font-bold">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Nexovira Ecosystem Integration</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Top graduates gain priority access to the Nexovira Expert Network, getting matched with paid client briefs and internal engineering internships.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-400 flex items-center justify-center font-bold">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Subsidized Registration Fee</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Nexovira firmly believes quality tech education must remain democratized. Tuition is covered 100% under the scholarship scheme.
              </p>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-gradient-to-r from-[#01213D] to-slate-900 border border-[#0682F4]/40 text-center space-y-3">
            <h3 className="text-lg font-bold text-white">Ready to elevate your tech journey?</h3>
            <p className="text-xs text-slate-300 max-w-md mx-auto">
              Choose from high-demand tracks in AI, Web Engineering, Product Design, Cloud DevOps, and Data Analytics.
            </p>
            <button
              onClick={() => setActiveTab('scholarship_catalog')}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-[#0682F4] hover:bg-[#06C3F8] text-white shadow-md transition-all active:scale-95"
            >
              <span>Explore Available Scholarship Courses</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* TAB C: SCHOLARSHIP FAQS */}
      {activeTab === 'faqs' && (
        <div className="space-y-6 max-w-3xl mx-auto">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">Frequently Asked Questions</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Clear answers regarding scholarship registration, payments, and community admission.
            </p>
          </div>

          <div className="space-y-3">
            {FAQS.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={idx}
                  className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm transition-all"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full p-4 text-left flex items-center justify-between text-xs sm:text-sm font-bold text-slate-900 dark:text-white hover:text-[#0682F4]"
                  >
                    <span>{faq.q}</span>
                    {isOpen ? <ChevronUp className="w-4 h-4 shrink-0 text-[#0682F4]" /> : <ChevronDown className="w-4 h-4 shrink-0 text-slate-400" />}
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 text-xs text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-800/60 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-900 text-center text-xs text-slate-500 dark:text-slate-400">
            Have more questions? Contact admissions directly at <a href="mailto:nexoviratech@gmail.com" className="text-[#0682F4] font-bold">nexoviratech@gmail.com</a>.
          </div>
        </div>
      )}

      {/* TAB D: MY LEARNING PORTAL (For enrolled students) */}
      {activeTab === 'my_learning' && (
        <div className="space-y-6">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-[#0682F4]" />
            <span>My Learning Portal</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {enrollments.map((enr) => {
              const matchedCourse = courses.find((c) => c.id === enr.courseId);
              return (
                <div
                  key={enr.id}
                  className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-[#0682F4] uppercase tracking-wider">
                        Enrolled Course
                      </span>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">{enr.courseTitle}</h3>
                      <p className="text-xs text-slate-400">Facilitator: {enr.instructor || 'Nexovira Educator'}</p>
                    </div>
                    {enr.progressPercent >= 100 && (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1">
                        <Award className="w-3 h-3" /> Completed
                      </span>
                    )}
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold text-slate-500 font-mono">
                      <span>Course Progress</span>
                      <span>{enr.progressPercent}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#0682F4] to-[#06C3F8] transition-all duration-500"
                        style={{ width: `${enr.progressPercent}%` }}
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    {matchedCourse?.whatsAppGroupLink && (
                      <a
                        href={matchedCourse.whatsAppGroupLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition-colors"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>WhatsApp Community</span>
                      </a>
                    )}

                    {enr.progressPercent >= 100 && matchedCourse && (
                      <button
                        onClick={() => setShowCertificateModal(matchedCourse)}
                        className="px-3 py-1.5 bg-[#0682F4] hover:bg-[#05A9F7] text-white font-bold text-xs rounded-xl flex items-center gap-1 transition-colors"
                      >
                        <Award className="w-3.5 h-3.5" />
                        <span>View Certificate</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. COURSE DETAILS DRAWER / MODAL */}
      {selectedCourseForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden my-6 text-slate-100 animate-in fade-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="relative h-48 w-full bg-slate-950 overflow-hidden">
              <img
                src={selectedCourseForDetails.thumbnail}
                alt={selectedCourseForDetails.title}
                className="w-full h-full object-cover opacity-60"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent" />
              
              <button
                onClick={() => setSelectedCourseForDetails(null)}
                className="absolute top-4 right-4 p-2 text-slate-300 hover:text-white rounded-full bg-slate-900/80 hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="absolute bottom-4 left-6 right-6 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#0682F4]/40 text-[#06C3F8] border border-[#0682F4]/60">
                  {selectedCourseForDetails.category}
                </span>
                <h2 className="text-xl font-black text-white">{selectedCourseForDetails.title}</h2>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 max-h-[65vh] overflow-y-auto text-xs">
              {/* Quick specs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 rounded-xl bg-slate-800/80 border border-slate-700">
                <div>
                  <span className="text-[10px] text-slate-400 block">Duration</span>
                  <span className="font-bold text-white">{selectedCourseForDetails.durationWeeks || '8 Weeks'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Skill Level</span>
                  <span className="font-bold text-white">{selectedCourseForDetails.skillLevel || 'Beginner'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Status</span>
                  <span className="font-bold text-emerald-400">{selectedCourseForDetails.scholarshipStatus || 'Open'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-emerald-400 block font-bold">Subsidized Fee</span>
                  <span className="font-black text-emerald-400 text-sm">
                    ₦{(selectedCourseForDetails.scholarshipRegistrationFee || 4500).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Description */}
              <div>
                <h4 className="font-bold text-white text-sm mb-1.5">About This Course</h4>
                <p className="text-slate-300 leading-relaxed">{selectedCourseForDetails.description}</p>
              </div>

              {/* Facilitator */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700">
                <img
                  src={selectedCourseForDetails.instructorAvatar}
                  alt={selectedCourseForDetails.instructor}
                  className="w-12 h-12 rounded-full object-cover border border-slate-600"
                />
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Lead Facilitator</span>
                  <strong className="text-white text-sm">{selectedCourseForDetails.instructor}</strong>
                  <p className="text-slate-300 text-[11px]">{selectedCourseForDetails.instructorTitle}</p>
                </div>
              </div>

              {/* What Students Will Learn */}
              {selectedCourseForDetails.learningOutcomes && selectedCourseForDetails.learningOutcomes.length > 0 && (
                <div>
                  <h4 className="font-bold text-white text-sm mb-2">What You Will Learn</h4>
                  <ul className="space-y-1.5">
                    {selectedCourseForDetails.learningOutcomes.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-slate-300">
                        <CheckCircle2 className="w-4 h-4 text-[#06C3F8] shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Requirements */}
              {selectedCourseForDetails.requirements && selectedCourseForDetails.requirements.length > 0 && (
                <div>
                  <h4 className="font-bold text-white text-sm mb-2">Course Requirements</h4>
                  <ul className="space-y-1">
                    {selectedCourseForDetails.requirements.map((req, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-slate-300">
                        <Check className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 line-through block">
                  Original Tuition: ₦{(selectedCourseForDetails.originalPrice || 85000).toLocaleString()}
                </span>
                <span className="text-sm font-bold text-emerald-400">
                  Scholarship: ₦{(selectedCourseForDetails.scholarshipRegistrationFee || 4500).toLocaleString()}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedCourseForDetails(null)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const course = selectedCourseForDetails;
                    setSelectedCourseForDetails(null);
                    handleOpenApplication(course);
                  }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-[#0682F4] to-[#06C3F8] hover:opacity-90 text-white shadow-md transition-all active:scale-95"
                >
                  <span>{`Register for Scholarship — ₦${(selectedCourseForDetails.scholarshipRegistrationFee || 4500).toLocaleString()}`}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 4. SCHOLARSHIP APPLICATION MODAL (6 STEPS & PAYMENT) */}
      <ScholarshipApplicationModal
        isOpen={isApplicationModalOpen}
        onClose={() => setIsApplicationModalOpen(false)}
        selectedCourse={selectedCourseForApplication}
        courses={courses}
        userProfile={userProfile}
        onApplicationCompleted={() => {
          loadAcademyData();
        }}
      />

      {/* 5. ADMIN COURSE ADD / EDIT MODAL */}
      <CourseFormModal
        isOpen={isCourseFormModalOpen}
        onClose={() => setIsCourseFormModalOpen(false)}
        courseToEdit={courseToEdit}
        onSaved={handleCourseSaved}
        userRole={userProfile?.role}
      />

      {/* 6. COURSE DELETION CONFIRMATION MODAL */}
      {courseToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl text-left">
            <div className="flex items-center gap-3 text-rose-500">
              <div className="p-3 bg-rose-500/10 rounded-xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Academy Course</h3>
                <p className="text-xs text-slate-400">Admin Control</p>
              </div>
            </div>

            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-1">
              <div className="text-xs font-bold text-white line-clamp-1">{courseToDelete.title}</div>
              <div className="text-[11px] text-slate-400">Instructor: {courseToDelete.instructor} • Category: {courseToDelete.category}</div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to delete this course from the Academy? It will be removed from Firestore and the public catalog.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isDeletingCourse}
                onClick={() => setCourseToDelete(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingCourse}
                onClick={handleConfirmDeleteCourse}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black shadow-lg shadow-rose-600/20 transition-colors flex items-center gap-2 cursor-pointer"
              >
                {isDeletingCourse ? (
                  <span>Deleting...</span>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Course</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. CERTIFICATE VIEWER MODAL */}
      {showCertificateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border-2 border-[#0682F4]/40 rounded-3xl max-w-2xl w-full p-8 shadow-2xl relative space-y-6 text-center">
            <button
              onClick={() => setShowCertificateModal(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-100 dark:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="border-4 border-[#0682F4]/30 p-8 rounded-2xl bg-slate-950 text-white relative overflow-hidden space-y-4">
              <div className="text-[#06C3F8] text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2">
                <Award className="w-5 h-5" />
                <span>NEXOVIRA ACADEMY VERIFIED CERTIFICATE</span>
              </div>

              <h2 className="text-2xl font-black font-serif text-white">Certificate of Achievement</h2>

              <p className="text-xs text-slate-400">This is to certify that</p>
              <div className="text-xl font-bold text-[#06C3F8] font-mono">
                {userProfile?.displayName || user?.email || 'Valued Scholar'}
              </div>

              <p className="text-xs text-slate-400">has successfully completed the technology track</p>
              <div className="text-base font-bold text-white">{showCertificateModal.title}</div>

              <div className="pt-4 flex items-center justify-between text-[10px] text-slate-400 font-mono border-t border-slate-800">
                <div>Facilitator: {showCertificateModal.instructor}</div>
                <div>Certificate Ref: NX-ACAD-{showCertificateModal.id}</div>
              </div>
            </div>

            <button
              onClick={() => alert('Certificate downloaded as PDF!')}
              className="px-6 py-3 bg-[#0682F4] text-white font-bold text-xs rounded-xl inline-flex items-center gap-2 shadow-lg"
            >
              <Download className="w-4 h-4" />
              <span>Download Verified Certificate (PDF)</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
