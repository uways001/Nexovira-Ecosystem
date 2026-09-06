import React, { useState, useEffect } from 'react';
import { 
  GraduationCap, 
  Search, 
  Filter, 
  Download, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  ExternalLink, 
  MessageSquare, 
  Eye, 
  Edit, 
  Trash2, 
  Plus, 
  RefreshCw, 
  DollarSign, 
  Users, 
  FileText,
  Mail,
  Phone,
  Building,
  Check,
  ChevronRight,
  AlertCircle,
  AlertTriangle,
  Lock,
  Unlock,
  Send
} from 'lucide-react';
import { Course, ScholarshipApplication, ScholarshipPaymentRecord } from '../../types';
import { 
  getScholarshipApplicationsFromFirestore, 
  getScholarshipPaymentsFromFirestore,
  updateScholarshipApplicationInFirestore,
  getOfficialCoursesFromFirestore,
  subscribeToOfficialCourses,
  deleteCourseFromFirestore,
  saveOfficialCourseToFirestore
} from '../../lib/firestoreService';
import { CourseFormModal } from '../CourseFormModal';

interface AdminScholarshipManagerProps {
  userRole?: string;
}

export const AdminScholarshipManager: React.FC<AdminScholarshipManagerProps> = ({ userRole }) => {
  const [subTab, setSubTab] = useState<'applications' | 'payments' | 'courses'>('applications');
  const [applications, setApplications] = useState<ScholarshipApplication[]>([]);
  const [payments, setPayments] = useState<ScholarshipPaymentRecord[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Status Category Filter (Strictly Separating: Payment Pending, Payment Successful — Form Not Completed, Registration Completed)
  const [statusCategory, setStatusCategory] = useState<'all' | 'payment_pending' | 'paid_form_pending' | 'registration_completed'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>('all');

  // Modals & Details
  const [selectedAppForDetail, setSelectedAppForDetail] = useState<ScholarshipApplication | null>(null);
  const [isCourseModalOpen, setIsCourseModalOpen] = useState<boolean>(false);
  const [courseToEdit, setCourseToEdit] = useState<Course | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [apps, pays, crs] = await Promise.all([
        getScholarshipApplicationsFromFirestore(),
        getScholarshipPaymentsFromFirestore(),
        getOfficialCoursesFromFirestore(true)
      ]);
      setApplications(apps);
      setPayments(pays);
      setCourses(crs);
    } catch (err) {
      console.error('Failed to load scholarship admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Real-time synchronization of courses from Firestore
    const unsubscribe = subscribeToOfficialCourses((liveCourses) => {
      setCourses(liveCourses);
    }, true);

    const handleCourseChanged = () => {
      loadData();
    };
    window.addEventListener('nexovira:courses-changed', handleCourseChanged);

    return () => {
      unsubscribe();
      window.removeEventListener('nexovira:courses-changed', handleCourseChanged);
    };
  }, []);

  // Compute Distinct Cohorts
  // 1. Payment Pending: users who have not yet had payment verified
  const paymentPendingApps = applications.filter(a => a.paymentStatus !== 'paid');
  
  // 2. Payment Successful — Form Not Completed: paid ₦4,500 successfully, but have not completed/submitted form
  const paidFormPendingApps = applications.filter(a => 
    a.paymentStatus === 'paid' && 
    (a.registrationStatus === 'form_pending' || (!a.formCompleted && a.registrationStatus !== 'completed' && a.registrationStatus !== 'confirmed'))
  );

  // 3. Registration Completed: payment verified AND registration form submitted with cohort assignment
  const registrationCompletedApps = applications.filter(a => 
    a.registrationStatus === 'completed' || 
    a.registrationStatus === 'confirmed' || 
    a.formCompleted === true
  );

  const totalApps = applications.length;
  const totalRevenue = applications
    .filter(a => a.paymentStatus === 'paid')
    .reduce((sum, a) => sum + (a.registrationFee || 4500), 0);

  // Filtered Applications by search, course, and selected status category
  const filteredApps = applications.filter(app => {
    // 1. Filter by specific course
    if (selectedCourseFilter !== 'all' && app.courseId !== selectedCourseFilter) {
      return false;
    }

    // 2. Filter by status category tab
    if (statusCategory === 'payment_pending') {
      if (app.paymentStatus === 'paid') return false;
    } else if (statusCategory === 'paid_form_pending') {
      const isPaidFormPending = app.paymentStatus === 'paid' && 
        (app.registrationStatus === 'form_pending' || (!app.formCompleted && app.registrationStatus !== 'completed' && app.registrationStatus !== 'confirmed'));
      if (!isPaidFormPending) return false;
    } else if (statusCategory === 'registration_completed') {
      const isCompleted = app.registrationStatus === 'completed' || app.registrationStatus === 'confirmed' || app.formCompleted === true;
      if (!isCompleted) return false;
    }

    // 3. Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = (app.fullName || '').toLowerCase().includes(q);
      const matchEmail = (app.email || '').toLowerCase().includes(q);
      const matchPhone = (app.phone || '').toLowerCase().includes(q);
      const matchRef = (app.referenceNumber || '').toLowerCase().includes(q);
      const matchPaymentRef = (app.paymentReference || '').toLowerCase().includes(q);
      const matchCourse = (app.courseTitle || '').toLowerCase().includes(q);
      if (!matchName && !matchEmail && !matchPhone && !matchRef && !matchPaymentRef && !matchCourse) {
        return false;
      }
    }

    return true;
  });

  const handleUpdateStatus = async (appId: string, newStatus: any) => {
    try {
      await updateScholarshipApplicationInFirestore(appId, { registrationStatus: newStatus });
      setApplications(prev => prev.map(a => a.id === appId ? { ...a, registrationStatus: newStatus } : a));
      if (selectedAppForDetail && selectedAppForDetail.id === appId) {
        setSelectedAppForDetail(prev => prev ? { ...prev, registrationStatus: newStatus } : null);
      }
    } catch (err) {
      console.error('Failed to update status:', err);
      alert('Failed to update application status.');
    }
  };

  const handleExportCSV = () => {
    if (applications.length === 0) {
      alert('No applications to export.');
      return;
    }
    const headers = [
      'Ref Number', 
      'Payment Ref', 
      'Full Name', 
      'Email', 
      'Phone', 
      'Course', 
      'Category Group', 
      'Fee', 
      'Payment Status', 
      'Registration Status', 
      'Form Completed', 
      'Date'
    ];
    const rows = applications.map(a => {
      let groupName = 'Payment Pending';
      if (a.paymentStatus === 'paid') {
        if (a.registrationStatus === 'completed' || a.registrationStatus === 'confirmed' || a.formCompleted) {
          groupName = 'Registration Completed';
        } else {
          groupName = 'Payment Successful — Form Not Completed';
        }
      }
      return [
        `"${a.referenceNumber || ''}"`,
        `"${a.paymentReference || ''}"`,
        `"${a.fullName || ''}"`,
        `"${a.email || ''}"`,
        `"${a.phone || ''}"`,
        `"${a.courseTitle || ''}"`,
        `"${groupName}"`,
        a.registrationFee || 4500,
        `"${a.paymentStatus}"`,
        `"${a.registrationStatus}"`,
        `"${a.formCompleted ? 'Yes' : 'No'}"`,
        `"${a.createdAt || ''}"`
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Nexovira_Academy_Applications_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleToggleCoursePublish = async (course: Course) => {
    try {
      const updated: Course = {
        ...course,
        published: !course.published,
        status: !course.published ? 'published' : 'draft',
        updatedAt: new Date().toISOString()
      };
      setCourses(prev => prev.map(c => c.id === course.id ? updated : c));
      await saveOfficialCourseToFirestore(updated, userRole);
    } catch (err) {
      console.error('Failed to update course publish state:', err);
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!confirm('Are you sure you want to permanently delete this course from the Academy? This cannot be undone.')) return;
    try {
      await deleteCourseFromFirestore(courseId, userRole);
      setCourses(prev => prev.filter(c => c.id !== courseId));
    } catch (err) {
      console.error('Failed to delete course:', err);
      alert('Failed to delete course.');
    }
  };

  const handleClearAllCourses = async () => {
    if (!confirm('Are you sure you want to delete ALL courses from the database? This will clear the entire course catalog permanently.')) return;
    try {
      for (const c of courses) {
        await deleteCourseFromFirestore(c.id, userRole);
      }
      setCourses([]);
      alert('All courses have been cleared.');
    } catch (err) {
      console.error('Failed to clear courses:', err);
      alert('Failed to clear some courses.');
    }
  };

  return (
    <div className="space-y-6 text-left">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#01213D] via-[#0682F4] to-[#06C3F8] flex items-center justify-center text-white shadow-md">
              <GraduationCap className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Nexovira Academy & Scholarship Management
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Enforced Flow: Select Course → Pay ₦4,500 → Verify Payment → Unlock Form → Submit → Join WhatsApp Group
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#0682F4]' : ''}`} />
          </button>

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => {
              setCourseToEdit(null);
              setIsCourseModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#0682F4] hover:bg-[#05A9F7] text-white shadow transition-all active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Course</span>
          </button>
        </div>
      </div>

      {/* THREE EXPLICITLY SEPARATED STATUS METRIC CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Payment Pending */}
        <div 
          onClick={() => {
            setSubTab('applications');
            setStatusCategory('payment_pending');
          }}
          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
            statusCategory === 'payment_pending'
              ? 'bg-amber-500/15 border-amber-500 ring-2 ring-amber-500/30'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-amber-500/50 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-amber-500 mb-1">
            <span>Payment Pending</span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-amber-500">{paymentPendingApps.length}</div>
          <span className="text-[10px] text-slate-400">Awaiting payment verification</span>
        </div>

        {/* 2. Payment Successful — Form Not Completed */}
        <div 
          onClick={() => {
            setSubTab('applications');
            setStatusCategory('paid_form_pending');
          }}
          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
            statusCategory === 'paid_form_pending'
              ? 'bg-sky-500/15 border-sky-500 ring-2 ring-sky-500/30'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-sky-500/50 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-sky-400 mb-1">
            <span>Paid — Form Not Completed</span>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-sky-400">{paidFormPendingApps.length}</div>
          <span className="text-[10px] text-slate-400">₦4,500 Paid • Form Awaiting</span>
        </div>

        {/* 3. Registration Completed */}
        <div 
          onClick={() => {
            setSubTab('applications');
            setStatusCategory('registration_completed');
          }}
          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
            statusCategory === 'registration_completed'
              ? 'bg-emerald-500/15 border-emerald-500 ring-2 ring-emerald-500/30'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-emerald-500 mb-1">
            <span>Registration Completed</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-emerald-500">{registrationCompletedApps.length}</div>
          <span className="text-[10px] text-slate-400">Form submitted & group unlocked</span>
        </div>

        {/* Total Revenue */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>Verified Fee Revenue</span>
            <DollarSign className="w-4 h-4 text-[#06C3F8]" />
          </div>
          <div className="text-2xl font-black text-[#0682F4] dark:text-[#06C3F8]">
            ₦{totalRevenue.toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-400">Total verified ₦4,500 fees</span>
        </div>
      </div>

      {/* Sub-tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setSubTab('applications')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
            subTab === 'applications'
              ? 'bg-[#0682F4] text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Scholarship Registrations ({applications.length})
        </button>

        <button
          onClick={() => setSubTab('payments')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
            subTab === 'payments'
              ? 'bg-[#0682F4] text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Payment Transactions ({payments.length})
        </button>

        <button
          onClick={() => setSubTab('courses')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
            subTab === 'courses'
              ? 'bg-[#0682F4] text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Academy Courses Catalog ({courses.length})
        </button>
      </div>

      {/* SUBTAB 1: SCHOLARSHIP APPLICATIONS */}
      {subTab === 'applications' && (
        <div className="space-y-4">
          
          {/* Category Tabs: Strictly Separate The 3 Categories */}
          <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setStatusCategory('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                statusCategory === 'all'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              All Records ({totalApps})
            </button>

            <button
              onClick={() => setStatusCategory('payment_pending')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                statusCategory === 'payment_pending'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-amber-500 hover:bg-amber-500/10'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Payment Pending ({paymentPendingApps.length})</span>
            </button>

            <button
              onClick={() => setStatusCategory('paid_form_pending')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                statusCategory === 'paid_form_pending'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-sky-400 hover:bg-sky-500/10'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Payment Successful — Form Not Completed ({paidFormPendingApps.length})</span>
            </button>

            <button
              onClick={() => setStatusCategory('registration_completed')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                statusCategory === 'registration_completed'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-emerald-500 hover:bg-emerald-500/10'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Registration Completed ({registrationCompletedApps.length})</span>
            </button>
          </div>

          {/* Search & Course Filter */}
          <div className="flex flex-col sm:flex-row gap-3 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by student name, email, phone, reference..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-transparent rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#0682F4]"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedCourseFilter}
                onChange={(e) => setSelectedCourseFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-transparent rounded-xl text-xs text-slate-700 dark:text-slate-200 focus:outline-none"
              >
                <option value="all">All Course Tracks</option>
                {courses.map(c => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Applications Table */}
          <div className="overflow-x-auto rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Ref Number</th>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Course Track</th>
                  <th className="py-3 px-4">Payment Status</th>
                  <th className="py-3 px-4">Scholarship Category Group</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredApps.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                      No applications found matching the selected status category.
                    </td>
                  </tr>
                ) : (
                  filteredApps.map((app) => {
                    const isPaid = app.paymentStatus === 'paid';
                    const isCompleted = app.registrationStatus === 'completed' || app.registrationStatus === 'confirmed' || app.formCompleted === true;
                    const isPaidFormPending = isPaid && !isCompleted;

                    return (
                      <tr key={app.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-mono font-bold text-[#0682F4] dark:text-[#06C3F8]">
                            {app.referenceNumber || app.id.slice(0, 10)}
                          </div>
                          {app.paymentReference && (
                            <div className="text-[10px] font-mono text-slate-400 truncate max-w-[130px]">
                              PayRef: {app.paymentReference}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 dark:text-white">{app.fullName || 'Candidate'}</div>
                          <div className="text-[11px] text-slate-400">{app.email}</div>
                          <div className="text-[10px] text-slate-500">{app.phone}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">{app.courseTitle}</div>
                          <div className="text-[10px] text-slate-400">{app.city || ''} {app.state ? `• ${app.state}` : ''}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                            isPaid
                              ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                              : 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
                          }`}>
                            {isPaid ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                            <span>{isPaid ? '₦4,500 Paid' : 'Payment Pending'}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {/* 3 MUTUALLY EXCLUSIVE CATEGORY BADGES */}
                          {!isPaid ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-500 border border-amber-500/30 flex items-center gap-1 w-max">
                              <Clock className="w-3 h-3" />
                              <span>Payment Pending</span>
                            </span>
                          ) : isPaidFormPending ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-sky-500/15 text-sky-400 border border-sky-500/30 flex items-center gap-1 w-max">
                              <AlertTriangle className="w-3 h-3" />
                              <span>Payment Successful — Form Not Completed</span>
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 w-max">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Registration Completed</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Reminder button for Paid But Form Not Completed */}
                            {isPaidFormPending && app.phone && (
                              <a
                                href={`https://wa.me/${app.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                                  `Hello ${app.fullName}, your ₦4,500 scholarship registration payment for ${app.courseTitle} was verified (Ref: ${app.paymentReference || app.referenceNumber}). Please complete your registration form to join your cohort WhatsApp community.`
                                )}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded-lg bg-sky-500/15 text-sky-400 hover:bg-sky-500/25 transition-colors"
                                title="Send Form Reminder on WhatsApp"
                              >
                                <Send className="w-3.5 h-3.5" />
                              </a>
                            )}

                            <button
                              onClick={() => setSelectedAppForDetail(app)}
                              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-[#0682F4]"
                              title="View Application Details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 2: PAYMENT TRANSACTIONS */}
      {subTab === 'payments' && (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Payment Reference</th>
                  <th className="py-3 px-4">Payer / Student</th>
                  <th className="py-3 px-4">Course Track</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4">Date Verified</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                      No payment transaction records logged yet.
                    </td>
                  </tr>
                ) : (
                  payments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-mono font-bold text-emerald-500">{p.paymentReference}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">{p.applicantName || p.studentName || 'Candidate'}</div>
                        <div className="text-[11px] text-slate-400">{p.applicantEmail || p.studentEmail || 'N/A'}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-800 dark:text-slate-200">{p.courseTitle}</td>
                      <td className="py-3 px-4 font-bold text-emerald-500">₦{p.amount.toLocaleString()}</td>
                      <td className="py-3 px-4 text-slate-500">{p.paymentMethod}</td>
                      <td className="py-3 px-4 text-slate-400">{new Date(p.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 3: ACADEMY COURSES CATALOG */}
      {subTab === 'courses' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Manage course tracks, WhatsApp communities, and registration limits.
            </span>
            <button
              onClick={() => {
                setCourseToEdit(null);
                setIsCourseModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#0682F4] text-white"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Course</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {courses.map((course) => (
              <div
                key={course.id}
                className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
              >
                <div className="flex items-start gap-3">
                  <img
                    src={course.thumbnail}
                    alt={course.title}
                    className="w-16 h-16 rounded-xl object-cover border border-slate-200 dark:border-slate-800 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {course.category}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        course.published ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                      }`}>
                        {course.published ? 'Published' : 'Draft'}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate pt-1">{course.title}</h4>
                    <p className="text-[11px] text-slate-400">Mentor: {course.instructor} • Fee: ₦{(course.scholarshipRegistrationFee || 4500).toLocaleString()}</p>
                  </div>
                </div>

                {/* WhatsApp Link Box */}
                <div className="p-2.5 rounded-xl bg-emerald-950/20 border border-emerald-800/30 text-xs flex items-center justify-between">
                  <div className="truncate pr-2">
                    <span className="text-[10px] text-emerald-400 font-bold block">Assigned WhatsApp Group:</span>
                    <span className="text-[11px] text-slate-300 font-mono truncate block">
                      {course.whatsAppGroupLink || 'No link assigned yet'}
                    </span>
                  </div>
                  {course.whatsAppGroupLink && (
                    <a
                      href={course.whatsAppGroupLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-emerald-400 hover:text-white rounded bg-emerald-900/40"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <button
                    onClick={() => handleToggleCoursePublish(course)}
                    className={`font-semibold ${course.published ? 'text-amber-500' : 'text-emerald-500'}`}
                  >
                    {course.published ? 'Unpublish' : 'Publish to Catalog'}
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setCourseToEdit(course);
                        setIsCourseModalOpen(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 flex items-center gap-1 font-semibold"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => handleDeleteCourse(course.id)}
                      className="p-1.5 text-rose-400 hover:text-rose-300 rounded hover:bg-rose-900/30 flex items-center gap-1 font-semibold"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DETAIL MODAL FOR APPLICATION */}
      {selectedAppForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-[#06C3F8]" />
                <h3 className="text-sm font-bold text-white">Application Details</h3>
              </div>
              <button
                onClick={() => setSelectedAppForDetail(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Admission Reference</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    selectedAppForDetail.paymentStatus === 'paid' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                  }`}>
                    {selectedAppForDetail.paymentStatus === 'paid' ? '₦4,500 Paid' : 'Payment Pending'}
                  </span>
                </div>
                <div className="text-sm font-black font-mono text-[#06C3F8]">{selectedAppForDetail.referenceNumber}</div>
                {selectedAppForDetail.paymentReference && (
                  <div className="text-[10px] font-mono text-slate-400">Verified Payment Ref: {selectedAppForDetail.paymentReference}</div>
                )}
                <div className="text-slate-300 font-semibold">{selectedAppForDetail.courseTitle}</div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block">Applicant Name</span>
                  <strong className="text-white">{selectedAppForDetail.fullName}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">WhatsApp Phone</span>
                  <strong className="text-white">{selectedAppForDetail.phone}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Email Address</span>
                  <strong className="text-white">{selectedAppForDetail.email}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Location</span>
                  <strong className="text-white">{selectedAppForDetail.city || 'N/A'}, {selectedAppForDetail.state || ''}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Status / Background</span>
                  <strong className="text-white">{selectedAppForDetail.currentOccupation || 'N/A'} ({selectedAppForDetail.experienceLevel || 'Beginner'})</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Form Completed</span>
                  <strong className={selectedAppForDetail.formCompleted ? 'text-emerald-400' : 'text-sky-400'}>
                    {selectedAppForDetail.formCompleted ? 'Yes (Submitted)' : 'No (Pending Submission)'}
                  </strong>
                </div>
              </div>

              {selectedAppForDetail.whyJoin && (
                <div>
                  <span className="text-[10px] text-slate-400 block mb-1">Why They Want to Join:</span>
                  <p className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-300 italic">
                    "{selectedAppForDetail.whyJoin}"
                  </p>
                </div>
              )}

              {selectedAppForDetail.goals && (
                <div>
                  <span className="text-[10px] text-slate-400 block mb-1">Post-Training Goals:</span>
                  <p className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-300 italic">
                    "{selectedAppForDetail.goals}"
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              {selectedAppForDetail.phone && (
                <a
                  href={`https://wa.me/${selectedAppForDetail.phone.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Open WhatsApp</span>
                </a>
              )}

              <button
                onClick={() => setSelectedAppForDetail(null)}
                className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COURSE FORM MODAL */}
      <CourseFormModal
        isOpen={isCourseModalOpen}
        onClose={() => setIsCourseModalOpen(false)}
        courseToEdit={courseToEdit}
        userRole={userRole}
        onSaved={() => {
          loadData();
        }}
      />

    </div>
  );
};
