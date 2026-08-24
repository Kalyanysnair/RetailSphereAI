import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wrench,
  Clock,
  CheckCircle2,
  XCircle,
  Sliders,
  LogOut,
  Sparkles,
  ArrowRight,
  TrendingUp,
  FileText,
  Search,
  Plus,
  Bell,
  User,
  ChevronDown,
  MessageSquare,
  Key,
  Lock,
  Unlock,
  ShieldCheck,
  Send,
  X,
  Eye,
  RefreshCw,
  AlertTriangle,
  SlidersHorizontal,
  Layers,
  Hammer,
  Check,
  AlertCircle,
  Filter,
  Truck,
  MapPin,
  Calendar,
  Image as ImageIcon,
  CheckSquare,
  LayoutDashboard,
  PackageCheck,
  Mail
} from 'lucide-react';

import {
  fetchWorkerSummaryDB,
  fetchWorkerTasksDB,
  startWorkerTaskDB,
  completeWorkerTaskDB,
  reportWorkerTaskIssueDB,
  fetchWorkerCompletedHistoryDB,
  fetchWorkerOnsiteJobsDB,
  updateWorkerOnsiteJobStatusDB,
  WorkerSummaryData,
  WorkerTaskItem,
  WorkerCompletedHistoryItem,
  WorkerOnsiteJobItem
} from '../../services/api_worker';
import { getCurrentUser, updateUserProfile, changeFirstPassword, changePasswordUser } from '../../services/api';
import { parseReferenceImages, openImageInNewTab } from '../../utils/imageUtils';
import { getMessagesForUser, markAdminMessageRead, markAllAdminMessagesReadForUser, isMessageReadByUser, AdminMessage } from '../../utils/adminMessagesStorage';
import { getStaffQueries, addStaffQuery, StaffQuery } from '../../utils/staffQueriesStorage';

export const WorkerDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState<any>(null);

  // Operational State
  const [summaryData, setSummaryData] = useState<WorkerSummaryData | null>(null);
  const [tasksList, setTasksList] = useState<WorkerTaskItem[]>([]);
  const [completedHistory, setCompletedHistory] = useState<WorkerCompletedHistoryItem[]>([]);
  const [onsiteJobsList, setOnsiteJobsList] = useState<WorkerOnsiteJobItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Tabs & Filters
  const [activeTab, setActiveTab] = useState<'dashboard' | 'my_tasks' | 'onsite' | 'completed' | 'admin_directives' | 'queries' | 'profile'>('dashboard');
  const [taskStatusFilter, setTaskStatusFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // Directives & Queries State
  const [adminDirectives, setAdminDirectives] = useState<AdminMessage[]>([]);
  const [staffQueries, setStaffQueries] = useState<StaffQuery[]>([]);
  const [queryCategory, setQueryCategory] = useState<'Production / Technical Query' | 'Material & Hardware Request' | 'Role & Access Permission' | 'General Operational Query'>('Production / Technical Query');
  const [querySubject, setQuerySubject] = useState('');
  const [queryMessage, setQueryMessage] = useState('');
  const [isSubmittingQuery, setIsSubmittingQuery] = useState(false);

  // Modals & Banners
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  // Selected Task Modal State
  const [selectedTaskForDetail, setSelectedTaskForDetail] = useState<WorkerTaskItem | null>(null);
  const [isTaskDetailModalOpen, setIsTaskDetailModalOpen] = useState(false);

  // Complete Task Modal State
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [completeNotes, setCompleteNotes] = useState('');
  const [completeWorkImages, setCompleteWorkImages] = useState('');
  const [completeProgressPct, setCompleteProgressPct] = useState(100);
  const [isSubmittingComplete, setIsSubmittingComplete] = useState(false);

  // Report Issue Modal State
  const [isReportIssueModalOpen, setIsReportIssueModalOpen] = useState(false);
  const [issueType, setIssueType] = useState('Material Unavailable');
  const [issueDescription, setIssueDescription] = useState('');
  const [issuePhotoUrl, setIssuePhotoUrl] = useState('');
  const [isSubmittingIssue, setIsSubmittingIssue] = useState(false);

  // Onsite Job Modal State
  const [selectedOnsiteJob, setSelectedOnsiteJob] = useState<WorkerOnsiteJobItem | null>(null);
  const [onsiteNotes, setOnsiteNotes] = useState('');
  const [onsiteBeforePhoto, setOnsiteBeforePhoto] = useState('');
  const [onsiteAfterPhoto, setOnsiteAfterPhoto] = useState('');

  // Profile / Password Modal State
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [mustChangePasswordModal, setMustChangePasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordNotice, setPasswordNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Data Loading Function
  const loadWorkerWorkspaceData = async () => {
    setLoading(true);
    try {
      const currentUser = await getCurrentUser();
      let email = 'worker@retailsphere.ai';
      let role = 'Worker';
      if (currentUser) {
        setUserProfile(currentUser);
        email = currentUser.email || email;
        role = (currentUser as any).role || role;
        if ((currentUser as any).must_change_password) {
          setMustChangePasswordModal(true);
        }
      }

      // Load Broadcast Directives and Staff Communication Queries
      const msgs = getMessagesForUser(email, role);
      setAdminDirectives(msgs);

      const allQueries = getStaffQueries();
      const userQueries = allQueries.filter(
        (q) => !q.staffEmail || q.staffEmail.toLowerCase() === email.toLowerCase()
      );
      setStaffQueries(userQueries);

      const [summary, tasks, history, onsite] = await Promise.all([
        fetchWorkerSummaryDB(),
        fetchWorkerTasksDB(taskStatusFilter),
        fetchWorkerCompletedHistoryDB(),
        fetchWorkerOnsiteJobsDB()
      ]);

      if (summary) setSummaryData(summary);
      setTasksList(tasks || []);
      setCompletedHistory(history || []);
      setOnsiteJobsList(onsite || []);
    } catch (err) {
      console.error('Error loading worker workspace data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendWorkerQuery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!querySubject.trim() || !queryMessage.trim()) return;
    setIsSubmittingQuery(true);
    try {
      const newQ = addStaffQuery({
        staffName: userProfile?.full_name || summaryData?.worker_name || 'Artisan Worker',
        staffEmail: userProfile?.email || 'worker@retailsphere.ai',
        category: queryCategory as any,
        subject: querySubject.trim(),
        message: queryMessage.trim()
      });
      setStaffQueries((prev) => [newQ, ...prev]);
      setSuccessNotice('Direct message sent to Production Staff & System Admin successfully!');
      setQuerySubject('');
      setQueryMessage('');
    } catch (err: any) {
      setErrorNotice(err.message || 'Failed to send query.');
    } finally {
      setIsSubmittingQuery(false);
      setTimeout(() => {
        setSuccessNotice(null);
        setErrorNotice(null);
      }, 4000);
    }
  };

  const handlePasswordChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordNotice({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    try {
      if (mustChangePasswordModal) {
        await changeFirstPassword(currentPassword, newPassword);
        setMustChangePasswordModal(false);
      } else {
        await changePasswordUser(newPassword, currentPassword);
      }
      setPasswordNotice({ type: 'success', text: 'Password updated successfully!' });
      setTimeout(() => setPasswordNotice(null), 3000);
    } catch (err: any) {
      setPasswordNotice({ type: 'error', text: err.message || 'Failed to update password.' });
    }
  };

  useEffect(() => {
    loadWorkerWorkspaceData();
  }, [taskStatusFilter]);

  const userEmail = userProfile?.email || '';
  const unreadDirectivesCount = adminDirectives.filter((m) => !isMessageReadByUser(m, userEmail)).length;

  // Derived Active Task
  const activeTask = tasksList.find((t) => t.task_status === 'IN_PROGRESS');

  // Filtered Tasks
  const filteredTasks = tasksList.filter((t) => {
    if (taskStatusFilter !== 'All' && t.task_status !== taskStatusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        t.order_id.toLowerCase().includes(q) ||
        t.job_name.toLowerCase().includes(q) ||
        t.stage_name.toLowerCase().includes(q) ||
        t.material.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Actions
  const handleStartTask = async (taskId: string) => {
    try {
      const res = await startWorkerTaskDB(taskId);
      setSuccessNotice(res.message || 'Task started successfully!');
      loadWorkerWorkspaceData();
    } catch (err: any) {
      setErrorNotice(err.message || 'Failed to start task.');
    } setTimeout(() => { setSuccessNotice(null); setErrorNotice(null); }, 4000);
  };

  const handleOpenCompleteModal = (task: WorkerTaskItem) => {
    setSelectedTaskForDetail(task);
    setCompleteNotes('');
    setCompleteWorkImages('');
    setCompleteProgressPct(100);
    setIsCompleteModalOpen(true);
  };

  const handleSubmitCompleteTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTaskForDetail) return;
    setIsSubmittingComplete(true);
    try {
      await completeWorkerTaskDB(selectedTaskForDetail.task_id, {
        notes: completeNotes,
        work_images: completeWorkImages,
        progress_percentage: completeProgressPct
      });
      setSuccessNotice(`Stage "${selectedTaskForDetail.stage_name}" marked COMPLETED!`);
      setIsCompleteModalOpen(false);
      setIsTaskDetailModalOpen(false);
      loadWorkerWorkspaceData();
    } catch (err: any) {
      setErrorNotice(err.message || 'Failed to complete task.');
    } finally {
      setIsSubmittingComplete(false);
      setTimeout(() => { setSuccessNotice(null); setErrorNotice(null); }, 4000);
    }
  };

  const handleOpenReportIssueModal = (task: WorkerTaskItem) => {
    setSelectedTaskForDetail(task);
    setIssueType('Material Unavailable');
    setIssueDescription('');
    setIssuePhotoUrl('');
    setIsReportIssueModalOpen(true);
  };

  const handleSubmitReportIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTaskForDetail || !issueDescription.trim()) return;
    setIsSubmittingIssue(true);
    try {
      await reportWorkerTaskIssueDB(selectedTaskForDetail.task_id, {
        issue_type: issueType,
        description: issueDescription.trim(),
        photo_url: issuePhotoUrl.trim() || undefined
      });
      setSuccessNotice(`Issue reported. Task "${selectedTaskForDetail.order_id}" set to ON_HOLD for Production Staff review.`);
      setIsReportIssueModalOpen(false);
      setIsTaskDetailModalOpen(false);
      loadWorkerWorkspaceData();
    } catch (err: any) {
      setErrorNotice(err.message || 'Failed to report issue.');
    } finally {
      setIsSubmittingIssue(false);
      setTimeout(() => { setSuccessNotice(null); setErrorNotice(null); }, 4000);
    }
  };

  const handleUpdateOnsiteJobStatus = async (jobId: number, newStatus: string) => {
    try {
      await updateWorkerOnsiteJobStatusDB(jobId, {
        status: newStatus,
        customer_notes: onsiteNotes,
        before_photos: onsiteBeforePhoto,
        after_photos: onsiteAfterPhoto
      });
      setSuccessNotice(`On-site job status updated to ${newStatus}.`);
      setSelectedOnsiteJob(null);
      loadWorkerWorkspaceData();
    } catch (err: any) {
      setErrorNotice(err.message || 'Failed to update on-site job.');
    } setTimeout(() => { setSuccessNotice(null); setErrorNotice(null); }, 4000);
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('token_type');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_profile');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="relative min-h-screen text-[#2C241D] flex selection:bg-[#48A63E] selection:text-white overflow-x-hidden">
      {/* Background Image Layer (Matching Admin, Retail Staff, and Production Staff Dashboards) */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat transition-all duration-700 pointer-events-none scale-105"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=2000&q=80')`,
        }}
      />
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-[#FAF7F2]/45 via-[#F3EDE5]/35 to-[#EAE1D5]/50 pointer-events-none" />

      {/* LEFT SIDEBAR NAVIGATION PANEL (Matching ProductionStaffDashboardPage) */}
      <aside className="w-72 flex-shrink-0 min-h-screen hidden md:block border-r border-[#D8CCBD] bg-[#E5DCD0]/80 backdrop-blur-xl p-6 space-y-8 relative z-20 shadow-sm">
        {/* Brand Logo Header */}
        <div className="space-y-1">
          <h2 className="text-2xl font-extrabold text-[#2C241D] tracking-tight flex items-center gap-1.5">
            <span>RetailSphere</span>
            <span className="text-[#38A132]">AI</span>
          </h2>
          <span className="text-[11px] font-extrabold text-[#38A132] uppercase tracking-[0.2em] block font-mono">
            ARTISAN WORKSHOP PORTAL
          </span>
        </div>

        {/* Sidebar Navigation */}
        <nav className="space-y-1.5 text-xs font-extrabold overflow-y-auto max-h-[calc(100vh-140px)] pr-1 scrollbar-none">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all ${
              activeTab === 'dashboard'
                ? 'bg-[#38A132] text-white shadow-md shadow-[#38A132]/25 font-extrabold'
                : 'text-[#4A3E32] hover:text-[#2C241D] hover:bg-[#DCD0C2]/60 font-extrabold'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <LayoutDashboard className="w-4 h-4" />
              <span className="text-xs">Today's Work</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('my_tasks')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all ${
              activeTab === 'my_tasks'
                ? 'bg-[#38A132] text-white shadow-md shadow-[#38A132]/25 font-extrabold'
                : 'text-[#4A3E32] hover:text-[#2C241D] hover:bg-[#DCD0C2]/60 font-extrabold'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Wrench className="w-4 h-4" />
              <span className="text-xs">My Assigned Tasks</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('onsite')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all ${
              activeTab === 'onsite'
                ? 'bg-[#38A132] text-white shadow-md shadow-[#38A132]/25 font-extrabold'
                : 'text-[#4A3E32] hover:text-[#2C241D] hover:bg-[#DCD0C2]/60 font-extrabold'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <MapPin className="w-4 h-4" />
              <span className="text-xs">On-Site Work</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('completed')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all ${
              activeTab === 'completed'
                ? 'bg-[#38A132] text-white shadow-md shadow-[#38A132]/25 font-extrabold'
                : 'text-[#4A3E32] hover:text-[#2C241D] hover:bg-[#DCD0C2]/60 font-extrabold'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <PackageCheck className="w-4 h-4" />
              <span className="text-xs">Completed History</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('admin_directives')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all ${
              activeTab === 'admin_directives'
                ? 'bg-[#38A132] text-white shadow-md shadow-[#38A132]/25 font-extrabold'
                : 'text-[#4A3E32] hover:text-[#2C241D] hover:bg-[#DCD0C2]/60 font-extrabold'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Mail className="w-4 h-4" />
              <span className="text-xs">Admin/Staff Directives</span>
            </div>
            {unreadDirectivesCount > 0 && (
              <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-amber-500 text-white animate-pulse">
                {unreadDirectivesCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('queries')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all ${
              activeTab === 'queries'
                ? 'bg-[#38A132] text-white shadow-md shadow-[#38A132]/25 font-extrabold'
                : 'text-[#4A3E32] hover:text-[#2C241D] hover:bg-[#DCD0C2]/60 font-extrabold'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <MessageSquare className="w-4 h-4" />
              <span className="text-xs">Production Communication</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all ${
              activeTab === 'profile'
                ? 'bg-[#38A132] text-white shadow-md shadow-[#38A132]/25 font-extrabold'
                : 'text-[#4A3E32] hover:text-[#2C241D] hover:bg-[#DCD0C2]/60 font-extrabold'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4" />
              <span className="text-xs">My Skills & Profile</span>
            </div>
          </button>
        </nav>
      </aside>

      {/* MAIN RIGHT CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto relative z-10">
        {/* Mobile Header Bar */}
        <div className="md:hidden bg-[#FAF7F2] border-b border-[#E6E1DA] p-4 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-sm text-[#2C241D]">Artisan Workshop</span>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {(['dashboard', 'my_tasks', 'onsite', 'completed', 'admin_directives', 'queries', 'profile'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold capitalize ${
                  activeTab === tab ? 'bg-[#48A63E] text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                {tab === 'dashboard' ? 'Today' : tab === 'my_tasks' ? 'Tasks' : tab === 'admin_directives' ? 'Directives' : tab}
              </button>
            ))}
          </div>
        </div>

        <main className="p-3 sm:p-5 lg:p-6 space-y-6 max-w-7xl w-full mx-auto">
          <div className="ultra-glass-panel rounded-[2.5rem] p-4 sm:p-6 lg:p-6 space-y-6 relative">
            {/* Glossy Top Reflection Sheen */}
            <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-white/60 via-white/20 to-transparent pointer-events-none rounded-t-[2.5rem]" />

            {/* UNREAD DIRECTIVES BANNER */}
            {unreadDirectivesCount > 0 && activeTab !== 'admin_directives' && (
              <div className="relative z-10 p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-amber-500/5 border-2 border-amber-400 text-amber-900 flex items-center justify-between gap-3 shadow-md animate-fadeIn">
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-amber-600 animate-bounce flex-shrink-0" />
                  <div>
                    <span className="font-black text-xs block">
                      📢 You have {unreadDirectivesCount} unread Admin/Staff Directive{unreadDirectivesCount > 1 ? 's' : ''}!
                    </span>
                    <span className="text-[11px] text-amber-800 font-medium">
                      System Admin & Production Staff have dispatched official instructions to the workshop.
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('admin_directives')}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs shadow-xs transition-all whitespace-nowrap cursor-pointer"
                >
                  View Directives →
                </button>
              </div>
            )}

            {/* NOTICES BANNER */}
            {successNotice && (
              <div className="bg-[#48A63E]/15 border border-[#48A63E]/40 text-[#48A63E] p-4 rounded-2xl text-xs sm:text-sm font-extrabold flex items-center justify-between animate-fadeIn relative z-20">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-[#48A63E]" />
                  <span>{successNotice}</span>
                </div>
                <button onClick={() => setSuccessNotice(null)} className="text-[#48A63E] hover:opacity-70">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            {errorNotice && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-2xl text-xs sm:text-sm font-extrabold flex items-center justify-between animate-fadeIn relative z-20">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-5 text-rose-600" />
                  <span>{errorNotice}</span>
                </div>
                <button onClick={() => setErrorNotice(null)} className="text-rose-700 hover:opacity-70">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* PAGE TOP HEADER */}
            <div className="relative z-30 flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-[#EFE7DE]">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#2C241D] tracking-tight">
                  {activeTab === 'dashboard' && "Today's Production & Stage Operations"}
                  {activeTab === 'my_tasks' && "My Assigned Stage Tasks"}
                  {activeTab === 'onsite' && "On-Site Installation & Field Work"}
                  {activeTab === 'completed' && "My Finished Stages History"}
                  {activeTab === 'admin_directives' && "Admin & Staff Directives"}
                  {activeTab === 'queries' && "Production Staff Communication Desk"}
                  {activeTab === 'profile' && "Artisan Profile & Skill Capabilities"}
                </h1>
                <p className="text-xs text-[#6B5C4D] mt-1 font-medium">
                  {activeTab === 'admin_directives' ? 'Official announcements and operational directives sent by System Admin and Production Staff.' : activeTab === 'queries' ? 'Direct communication line to send technical queries or material requests to Production Staff.' : 'Production workshop operational workspace calculated live from PostgreSQL.'}
                </p>
              </div>

              {/* STAFF NAME DROPDOWN PILL ("Name Session" matching Staff Dashboards) */}
              <div className="relative self-start lg:self-auto">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2.5 px-3 py-1.5 rounded-2xl bg-white border border-[#E2D7CB] hover:border-[#48A63E] transition-all shadow-xs cursor-pointer"
                  title="Click for profile and sign out options"
                >
                  <div className="w-7 h-7 rounded-xl bg-gradient-to-r from-[#48A63E] to-[#3D9134] text-white font-extrabold text-xs flex items-center justify-center flex-shrink-0 shadow-md">
                    {(userProfile?.full_name || summaryData?.worker_name || 'Artisan Worker')
                      .split(' ')
                      .map((n: string) => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <span className="text-xs font-extrabold text-[#2C241D]">
                    {userProfile?.full_name || summaryData?.worker_name || 'Artisan Worker'}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 text-[#6B5C4D] transition-transform ${isUserMenuOpen ? 'rotate-180 text-[#48A63E]' : ''}`} />
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-[#FAF7F2] border-2 border-[#E2D7CB] rounded-2xl shadow-2xl p-2 z-[100] animate-fadeIn space-y-1">
                    <button
                      onClick={() => {
                        setIsProfileModalOpen(true);
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-extrabold text-[#2C241D] hover:bg-[#EAE0D4] transition-colors text-left cursor-pointer"
                    >
                      <User className="w-4 h-4 text-[#48A63E]" />
                      <span>View Profile</span>
                    </button>

                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        handleLogout();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-extrabold text-rose-700 hover:bg-rose-100/80 transition-colors text-left cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 text-rose-600" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* TAB 1: TODAY'S WORK / OPERATIONAL DASHBOARD */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                {/* KPI OVERVIEW (Executive Glass Cards) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="ultra-glass-card bg-white/60 backdrop-blur-xl rounded-2xl p-4 border border-white/80 shadow-md transition-all hover:bg-white/75 hover:shadow-lg">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between">
                      <span>Active Task</span>
                      <Hammer className="w-4 h-4 text-[#48A63E]" />
                    </div>
                    <div className="text-2xl font-extrabold text-[#48A63E] mt-2">
                      {summaryData?.active_tasks_count || (activeTask ? 1 : 0)}
                    </div>
                    <div className="text-[10px] text-[#48A63E] font-bold mt-1">Currently In Progress</div>
                  </div>

                  <div className="ultra-glass-card bg-white/60 backdrop-blur-xl rounded-2xl p-4 border border-white/80 shadow-md transition-all hover:bg-white/75 hover:shadow-lg">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between">
                      <span>Pending Tasks</span>
                      <Wrench className="w-4 h-4 text-amber-600" />
                    </div>
                    <div className="text-2xl font-extrabold text-[#2C241D] mt-2">
                      {summaryData?.pending_tasks_count || tasksList.filter(t => t.task_status === 'ASSIGNED').length}
                    </div>
                    <div className="text-[10px] text-amber-800 font-bold mt-1">Assigned & Waiting</div>
                  </div>

                  <div className="ultra-glass-card bg-white/60 backdrop-blur-xl rounded-2xl p-4 border border-white/80 shadow-md transition-all hover:bg-white/75 hover:shadow-lg">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between">
                      <span>Completed Today</span>
                      <PackageCheck className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="text-2xl font-extrabold text-[#2C241D] mt-2">
                      {summaryData?.completed_today_count || completedHistory.length}
                    </div>
                    <div className="text-[10px] text-blue-700 font-bold mt-1">Finished Stages</div>
                  </div>

                  <div className="ultra-glass-card bg-white/60 backdrop-blur-xl rounded-2xl p-4 border border-white/80 shadow-md transition-all hover:bg-white/75 hover:shadow-lg">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-[#7A6C5E] flex items-center justify-between">
                      <span>On-Site Jobs</span>
                      <MapPin className="w-4 h-4 text-purple-600" />
                    </div>
                    <div className="text-2xl font-extrabold text-[#2C241D] mt-2">
                      {summaryData?.onsite_jobs_count || onsiteJobsList.length}
                    </div>
                    <div className="text-[10px] text-purple-700 font-bold mt-1">Field Service</div>
                  </div>
                </div>

            {/* HIGHLIGHTED ACTIVE TASK BANNER */}
            <div className="bg-white rounded-3xl p-6 border-2 border-[#48A63E] shadow-lg relative overflow-hidden space-y-4">
              <div className="flex items-center justify-between border-b border-[#EFE7DE] pb-3">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#48A63E] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-[#48A63E]"></span>
                  </span>
                  <h3 className="text-lg font-black text-[#2C241D]">CURRENT ACTIVE TASK</h3>
                </div>
                {activeTask && (
                  <span className="px-3 py-1 bg-[#48A63E]/15 text-[#48A63E] font-black text-xs rounded-xl border border-[#48A63E]/30">
                    IN PROGRESS
                  </span>
                )}
              </div>

              {activeTask ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                  <div className="space-y-2 md:col-span-2">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono font-black text-[#48A63E] bg-[#48A63E]/10 px-2.5 py-1 rounded-lg border border-[#48A63E]/20">
                        {activeTask.order_id}
                      </span>
                      <h4 className="text-xl font-black text-[#2C241D]">{activeTask.job_name}</h4>
                    </div>

                    <div className="p-3 bg-[#FAF7F2] rounded-2xl border border-[#E2D7CB] grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="block text-[10px] font-bold text-[#7A6C5E]">Assigned Stage:</span>
                        <span className="font-extrabold text-[#2C241D]">{activeTask.stage_name}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] font-bold text-[#7A6C5E]">Material:</span>
                        <span className="font-extrabold text-[#2C241D]">{activeTask.material}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] font-bold text-[#7A6C5E]">Dimensions:</span>
                        <span className="font-mono font-bold text-[#2C241D]">{activeTask.dimensions}</span>
                      </div>
                    </div>

                    <p className="text-xs font-semibold text-[#6B5C4D]">
                      <strong className="text-[#2C241D]">Instructions:</strong> {activeTask.technical_instructions}
                    </p>
                  </div>

                  <div className="flex flex-col items-stretch gap-2.5">
                    <button
                      onClick={() => { setSelectedTaskForDetail(activeTask); setIsTaskDetailModalOpen(true); }}
                      className="w-full py-3 rounded-2xl bg-[#FAF7F2] hover:bg-[#F2ECE1] text-[#2C241D] font-extrabold text-xs border border-[#E2D7CB] flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                    >
                      <Eye className="w-4 h-4 text-[#48A63E]" />
                      <span>View Specifications & Images</span>
                    </button>
                    <button
                      onClick={() => handleOpenCompleteModal(activeTask)}
                      className="w-full py-3 rounded-2xl bg-[#48A63E] hover:bg-[#3D9134] text-white font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-[#48A63E]/20"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Complete Stage</span>
                    </button>
                    <button
                      onClick={() => handleOpenReportIssueModal(activeTask)}
                      className="w-full py-2.5 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-800 font-extrabold text-xs border border-amber-300 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span>Report Issue / Put On Hold</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center bg-[#FAF7F2] rounded-2xl border border-[#E2D7CB] space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-[#7A6C5E] mx-auto opacity-40" />
                  <p className="font-extrabold text-sm text-[#2C241D]">No Active Task Currently In Progress</p>
                  <p className="text-xs font-semibold text-[#7A6C5E]">Select an assigned task from below or "My Tasks" tab to start working.</p>
                </div>
              )}
            </div>

            {/* ASSIGNED & UPCOMING TASKS LIST */}
            <div className="bg-white rounded-3xl p-6 border border-[#E2D7CB] shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-[#EFE7DE] pb-3">
                <h4 className="font-black text-base text-[#2C241D]">Upcoming Assigned Work</h4>
                <button onClick={() => setActiveTab('my_tasks')} className="text-xs font-extrabold text-[#48A63E] hover:underline flex items-center gap-1">
                  <span>View All ({tasksList.length})</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {tasksList.filter(t => t.task_status !== 'IN_PROGRESS').length === 0 ? (
                <div className="py-10 text-center text-[#7A6C5E] text-xs font-bold">
                  No upcoming assigned tasks. All work is up to date!
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {tasksList.filter(t => t.task_status !== 'IN_PROGRESS').slice(0, 4).map((task) => (
                    <div key={task.task_id} className="p-4 bg-[#FAF7F2] rounded-2xl border border-[#E2D7CB] space-y-3 hover:border-[#48A63E] transition-all">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono font-black text-[#48A63E] bg-[#48A63E]/10 px-2 py-0.5 rounded border border-[#48A63E]/20">
                          {task.order_id}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-extrabold border ${
                          task.task_status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                          task.task_status === 'ON_HOLD' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                          'bg-[#48A63E]/15 text-[#48A63E] border-[#48A63E]/30'
                        }`}>
                          {task.task_status}
                        </span>
                      </div>

                      <div>
                        <h5 className="font-extrabold text-sm text-[#2C241D]">{task.job_name}</h5>
                        <p className="text-xs font-bold text-[#7A6C5E]">{task.stage_name} • {task.material}</p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-[#EFE7DE]">
                        <span className="text-[11px] font-semibold text-[#7A6C5E]">Assigned: {task.assigned_date}</span>
                        {task.task_status === 'ASSIGNED' && (
                          <button
                            onClick={() => handleStartTask(task.task_id)}
                            className="px-3 py-1.5 rounded-xl bg-[#48A63E] hover:bg-[#3D9134] text-white font-extrabold text-xs shadow-xs flex items-center gap-1 cursor-pointer"
                          >
                            <span>Start Task</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {task.task_status !== 'ASSIGNED' && (
                          <button
                            onClick={() => { setSelectedTaskForDetail(task); setIsTaskDetailModalOpen(true); }}
                            className="px-3 py-1.5 rounded-xl bg-white border border-[#E2D7CB] text-[#2C241D] font-extrabold text-xs hover:bg-[#F2ECE1]"
                          >
                            Open Specs
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: MY TASKS (Full Filterable Work List) */}
        {activeTab === 'my_tasks' && (
          <div className="bg-white rounded-3xl p-6 border border-[#E2D7CB] shadow-sm space-y-5">
            {/* Header & Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-[#EFE7DE] pb-4">
              <div>
                <h3 className="text-lg font-black text-[#2C241D]">My Assigned Production Tasks</h3>
                <p className="text-xs font-bold text-[#7A6C5E]">Filter and execute tasks assigned to your worker account.</p>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="w-4 h-4 text-[#9E9082] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search by order ID, material..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl font-bold focus:outline-none focus:border-[#48A63E]"
                  />
                </div>

                <select
                  value={taskStatusFilter}
                  onChange={(e) => setTaskStatusFilter(e.target.value)}
                  className="px-3 py-2 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl text-xs font-extrabold text-[#2C241D] cursor-pointer"
                >
                  <option value="All">All Statuses</option>
                  <option value="ASSIGNED">Assigned</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="ON_HOLD">On Hold</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </div>
            </div>

            {/* Task Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#EFE7DE] text-[#7A6C5E] font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Order Ref</th>
                    <th className="py-3 px-4">Job / Product Title</th>
                    <th className="py-3 px-4">Production Stage</th>
                    <th className="py-3 px-4">Material Specs</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFE7DE]">
                  {filteredTasks.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-[#7A6C5E]">
                        No tasks found matching current filter.
                      </td>
                    </tr>
                  ) : (
                    filteredTasks.map((task) => (
                      <tr key={task.task_id} className="hover:bg-[#FAF7F2] transition-colors">
                        <td className="py-3.5 px-4 font-mono font-black text-[#48A63E]">
                          {task.order_id}
                        </td>
                        <td className="py-3.5 px-4 font-extrabold text-[#2C241D]">
                          {task.job_name}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-[#6B5C4D]">
                          {task.stage_name}
                        </td>
                        <td className="py-3.5 px-4 text-[#6B5C4D]">
                          {task.material} ({task.dimensions})
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-extrabold border ${
                            task.task_status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                            task.task_status === 'IN_PROGRESS' ? 'bg-[#48A63E]/15 text-[#48A63E] border-[#48A63E]/30 animate-pulse' :
                            task.task_status === 'ON_HOLD' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                            'bg-slate-100 text-slate-800 border-slate-300'
                          }`}>
                            {task.task_status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-2">
                          <button
                            onClick={() => { setSelectedTaskForDetail(task); setIsTaskDetailModalOpen(true); }}
                            className="px-3 py-1.5 rounded-xl bg-[#FAF7F2] hover:bg-[#F2ECE1] border border-[#E2D7CB] text-[#2C241D] font-extrabold text-xs"
                          >
                            Open Task
                          </button>
                          {task.task_status === 'ASSIGNED' && (
                            <button
                              onClick={() => handleStartTask(task.task_id)}
                              className="px-3 py-1.5 rounded-xl bg-[#48A63E] hover:bg-[#3D9134] text-white font-extrabold text-xs shadow-xs"
                            >
                              Start
                            </button>
                          )}
                          {task.task_status === 'IN_PROGRESS' && (
                            <button
                              onClick={() => handleOpenCompleteModal(task)}
                              className="px-3 py-1.5 rounded-xl bg-[#48A63E] hover:bg-[#3D9134] text-white font-extrabold text-xs shadow-xs"
                            >
                              Complete
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: ON-SITE SERVICE WORK */}
        {activeTab === 'onsite' && (
          <div className="bg-white rounded-3xl p-6 border border-[#E2D7CB] shadow-sm space-y-5">
            <div className="border-b border-[#EFE7DE] pb-4">
              <h3 className="text-lg font-black text-[#2C241D]">On-Site Installation & Field Service Jobs</h3>
              <p className="text-xs font-bold text-[#7A6C5E]">On-site furniture installation, assembly, repair and customer service tasks.</p>
            </div>

            {onsiteJobsList.length === 0 ? (
              <div className="py-12 text-center bg-[#FAF7F2] rounded-2xl border border-[#E2D7CB] space-y-2">
                <MapPin className="w-10 h-10 text-[#7A6C5E] mx-auto opacity-40" />
                <p className="font-extrabold text-sm text-[#2C241D]">No Active On-Site Assignments</p>
                <p className="text-xs font-semibold text-[#7A6C5E]">Field service requests assigned by Retail/Production Staff will appear here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {onsiteJobsList.map((job) => (
                  <div key={job.job_id} className="p-5 bg-[#FAF7F2] rounded-3xl border border-[#E2D7CB] space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-black text-purple-700 bg-purple-100 px-2.5 py-1 rounded-lg border border-purple-300">
                        {job.service_id}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-extrabold bg-[#48A63E]/15 text-[#48A63E] border border-[#48A63E]/30">
                        {job.status}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-black text-base text-[#2C241D]">{job.service_category}</h4>
                      <p className="text-xs font-semibold text-[#6B5C4D]">{job.description}</p>
                    </div>

                    <div className="p-3 bg-white rounded-2xl border border-[#E2D7CB] space-y-1 text-xs">
                      <div className="flex items-center gap-1.5 text-[#2C241D] font-extrabold">
                        <User className="w-3.5 h-3.5 text-[#48A63E]" />
                        <span>{job.customer_name} ({job.customer_phone || 'N/A'})</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[#6B5C4D] font-bold">
                        <MapPin className="w-3.5 h-3.5 text-[#48A63E]" />
                        <span>{job.address}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[#6B5C4D] font-bold">
                        <Calendar className="w-3.5 h-3.5 text-[#48A63E]" />
                        <span>Scheduled: {job.scheduled_time}</span>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-[#EFE7DE]">
                      {job.status === 'ASSIGNED' && (
                        <button
                          onClick={() => handleUpdateOnsiteJobStatus(job.job_id, 'IN_TRANSIT')}
                          className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs shadow-xs"
                        >
                          Start Dispatch / In Transit
                        </button>
                      )}
                      {job.status === 'IN_TRANSIT' && (
                        <button
                          onClick={() => handleUpdateOnsiteJobStatus(job.job_id, 'IN_PROGRESS')}
                          className="px-4 py-2 rounded-xl bg-[#48A63E] hover:bg-[#3D9134] text-white font-extrabold text-xs shadow-xs"
                        >
                          Arrived & Start Service
                        </button>
                      )}
                      {job.status === 'IN_PROGRESS' && (
                        <button
                          onClick={() => handleUpdateOnsiteJobStatus(job.job_id, 'COMPLETED')}
                          className="px-4 py-2 rounded-xl bg-[#48A63E] hover:bg-[#3D9134] text-white font-extrabold text-xs shadow-xs flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Mark Completed</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: COMPLETED WORK HISTORY */}
        {activeTab === 'completed' && (
          <div className="bg-white rounded-3xl p-6 border border-[#E2D7CB] shadow-sm space-y-5">
            <div className="border-b border-[#EFE7DE] pb-4">
              <h3 className="text-lg font-black text-[#2C241D]">Completed Production Stages History</h3>
              <p className="text-xs font-bold text-[#7A6C5E]">Record of finished production stages with actual calculated task duration.</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#EFE7DE] text-[#7A6C5E] font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Order Ref</th>
                    <th className="py-3 px-4">Job Title</th>
                    <th className="py-3 px-4">Stage Name</th>
                    <th className="py-3 px-4">Completion Date</th>
                    <th className="py-3 px-4">Actual Duration</th>
                    <th className="py-3 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFE7DE]">
                  {completedHistory.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-[#7A6C5E]">
                        No completed tasks logged yet.
                      </td>
                    </tr>
                  ) : (
                    completedHistory.map((item, idx) => (
                      <tr key={idx} className="hover:bg-[#FAF7F2] transition-colors">
                        <td className="py-3.5 px-4 font-mono font-black text-[#48A63E]">
                          {item.order_id}
                        </td>
                        <td className="py-3.5 px-4 font-extrabold text-[#2C241D]">
                          {item.job_name}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-[#6B5C4D]">
                          {item.stage_name}
                        </td>
                        <td className="py-3.5 px-4 text-[#6B5C4D]">
                          {item.completed_date}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-[#38A132]">
                          ⏱️ {item.duration}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <span className="px-2.5 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            COMPLETED
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB: ADMIN & STAFF DIRECTIVES */}
        {activeTab === 'admin_directives' && (
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 border border-[#E2D7CB] shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-[#EFE7DE] pb-4">
              <div>
                <h3 className="text-lg font-black text-[#2C241D]">Official Admin & Staff Directives</h3>
                <p className="text-xs text-[#6B5C4D]">Executive announcements and operational directives sent to workshop staff.</p>
              </div>
              {unreadDirectivesCount > 0 && (
                <button
                  onClick={() => {
                    const email = userProfile?.email || '';
                    const role = (userProfile as any)?.role || 'Worker';
                    markAllAdminMessagesReadForUser(email, role);
                    setAdminDirectives(getMessagesForUser(email, role));
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-[#38A132] hover:bg-[#2F852A] text-white text-xs font-extrabold shadow-sm transition-all cursor-pointer"
                >
                  Mark All as Read
                </button>
              )}
            </div>

            {adminDirectives.length === 0 ? (
              <div className="p-8 text-center bg-white/60 backdrop-blur-xl rounded-2xl border border-white/80 space-y-2">
                <Mail className="w-8 h-8 text-[#A39282] mx-auto" />
                <h4 className="text-sm font-extrabold text-[#2C241D]">No Official Directives</h4>
                <p className="text-xs text-[#7A6C5E]">There are currently no active directives broadcasted to your account.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {adminDirectives.map((msg) => {
                  const isRead = isMessageReadByUser(msg, userProfile?.email);
                  return (
                    <div
                      key={msg.id}
                      className={`p-5 rounded-2xl border transition-all ${
                        !isRead
                          ? 'bg-amber-50/90 border-amber-300 shadow-md'
                          : 'bg-white/70 border-white/90 shadow-sm'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#EFE7DE] pb-3 mb-3">
                        <div className="flex items-center gap-2.5">
                          <span className="px-2.5 py-0.5 rounded-md bg-[#38A132]/15 text-[#38A132] text-[10px] font-black border border-[#38A132]/30">
                            {msg.sender || 'System Admin'}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 text-[10px] font-extrabold">
                            {msg.recipientType}
                          </span>
                          {!isRead && (
                            <span className="px-2 py-0.5 rounded-md bg-amber-500 text-white text-[10px] font-black animate-pulse">
                              NEW DIRECTIVE
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] font-bold text-[#7A6C5E]">{msg.createdDate}</span>
                      </div>

                      <h4 className="text-base font-black text-[#2C241D] mb-1.5">{msg.subject}</h4>
                      <p className="text-xs text-[#4A3E32] leading-relaxed whitespace-pre-wrap">{msg.message}</p>

                      {!isRead && (
                        <div className="mt-4 pt-3 border-t border-[#EFE7DE] flex justify-end">
                          <button
                            onClick={() => {
                              markAdminMessageRead(msg.id, userProfile?.email);
                              setAdminDirectives(getMessagesForUser(userProfile?.email || '', userProfile?.role || 'Worker'));
                            }}
                            className="px-3 py-1.5 rounded-xl bg-white border border-[#E2D7CB] hover:bg-[#FAF7F2] text-xs font-extrabold text-[#2C241D] transition-all cursor-pointer shadow-2xs"
                          >
                            Acknowledge & Mark Read
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB: PRODUCTION STAFF COMMUNICATION DESK */}
        {activeTab === 'queries' && (
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 border border-[#E2D7CB] shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EFE7DE] pb-4">
              <div>
                <h3 className="text-lg font-black text-[#2C241D]">Production Staff Communication & Query Desk</h3>
                <p className="text-xs text-[#6B5C4D]">Send technical questions, material shortages, or operational requests directly to Production Staff & System Admin.</p>
              </div>
            </div>

            {/* SUBMIT NEW QUERY FORM */}
            <div className="ultra-glass-card bg-white/70 backdrop-blur-xl rounded-2xl p-5 border border-white/90 shadow-md space-y-4">
              <h4 className="text-sm font-extrabold text-[#2C241D] flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#38A132]" />
                <span>Submit Direct Message to Production Staff</span>
              </h4>

              <form onSubmit={handleSendWorkerQuery} className="space-y-3.5 text-xs font-semibold">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-extrabold text-[#2C241D] mb-1">Query Category *</label>
                    <select
                      value={queryCategory}
                      onChange={(e) => setQueryCategory(e.target.value as any)}
                      className="w-full p-2.5 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl font-bold text-[#2C241D]"
                    >
                      <option value="Production / Technical Query">Production / Technical Query</option>
                      <option value="Material & Hardware Request">Material & Hardware Request</option>
                      <option value="Role & Access Permission">Role & Access Permission</option>
                      <option value="General Operational Query">General Operational Query</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-extrabold text-[#2C241D] mb-1">Subject / Job Reference *</label>
                    <input
                      type="text"
                      placeholder="e.g. Timber specification doubt for ORD-0014"
                      value={querySubject}
                      onChange={(e) => setQuerySubject(e.target.value)}
                      className="w-full p-2.5 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl font-bold text-[#2C241D]"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-extrabold text-[#2C241D] mb-1">Message Details *</label>
                  <textarea
                    rows={3}
                    placeholder="Write your question or request for Production Staff..."
                    value={queryMessage}
                    onChange={(e) => setQueryMessage(e.target.value)}
                    className="w-full p-3 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#38A132]"
                    required
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmittingQuery}
                    className="px-5 py-2.5 rounded-xl bg-[#38A132] hover:bg-[#2F852A] text-white font-extrabold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>{isSubmittingQuery ? 'Sending...' : 'Send Message to Production Staff'}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* PREVIOUS QUERIES & RESPONSES LIST */}
            <div className="space-y-4">
              <h4 className="text-sm font-extrabold text-[#2C241D]">Sent Communication History ({staffQueries.length})</h4>
              {staffQueries.length === 0 ? (
                <div className="p-6 text-center bg-white/60 backdrop-blur-xl rounded-2xl border border-white/80 text-[#7A6C5E] text-xs font-bold">
                  No communication history found. Submit your first query above to contact Production Staff.
                </div>
              ) : (
                <div className="space-y-3">
                  {staffQueries.map((q) => (
                    <div key={q.id} className="p-4 rounded-2xl bg-white/70 border border-white/90 shadow-sm space-y-2.5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#EFE7DE] pb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-extrabold text-[#2C241D]">{q.subject}</span>
                          <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 text-[10px] font-bold">
                            {q.category}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                            q.status === 'Resolved' ? 'bg-emerald-100 text-emerald-800' :
                            q.status === 'Approved' ? 'bg-blue-100 text-blue-800' :
                            q.status === 'In Review' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {q.status}
                          </span>
                          <span className="text-[10px] text-[#7A6C5E]">{q.createdAt}</span>
                        </div>
                      </div>

                      <p className="text-xs text-[#4A3E32]">{q.message}</p>

                      {q.adminResponse && (
                        <div className="p-3 bg-[#38A132]/10 rounded-xl border border-[#38A132]/30 text-xs space-y-1">
                          <span className="font-extrabold text-[#2C241D] block">Response from Production Staff / Admin:</span>
                          <p className="text-[#2C241D] font-medium">{q.adminResponse}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: WORKER PROFILE & SKILLS */}
        {activeTab === 'profile' && (
          <div className="max-w-2xl mx-auto bg-white rounded-3xl p-6 sm:p-8 border border-[#E2D7CB] shadow-sm space-y-6">
            <div className="flex items-center gap-4 border-b border-[#EFE7DE] pb-4">
              <div className="w-16 h-16 rounded-3xl bg-[#48A63E]/20 text-[#48A63E] font-black text-2xl flex items-center justify-center border-2 border-[#48A63E]">
                {(userProfile?.full_name || 'W')[0]}
              </div>
              <div>
                <h3 className="text-xl font-black text-[#2C241D]">{userProfile?.full_name || 'Worker'}</h3>
                <p className="text-xs font-mono font-bold text-[#7A6C5E]">{userProfile?.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-2.5 py-0.5 rounded-md bg-[#48A63E]/15 text-[#48A63E] text-[10px] font-black border border-[#48A63E]/30">
                    Role: Worker
                  </span>
                  {summaryData?.is_driver && (
                    <span className="px-2.5 py-0.5 rounded-md bg-purple-100 text-purple-800 text-[10px] font-black border border-purple-300 flex items-center gap-1">
                      <Truck className="w-3 h-3 text-purple-700" />
                      <span>Fleet Driver Capable</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <h4 className="font-black text-sm text-[#2C241D]">Assigned Artisan Skills</h4>
              <div className="p-4 bg-[#FAF7F2] rounded-2xl border border-[#E2D7CB] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#7A6C5E]">Primary Craft Specialization:</span>
                  <span className="font-extrabold text-[#2C241D]">{userProfile?.specialization || 'Woodwork & Carpentry'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#7A6C5E]">Driver Capability:</span>
                  <span className="font-extrabold text-[#2C241D]">{summaryData?.is_driver ? 'Yes (Vehicle Eligible)' : 'No'}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-[#EFE7DE]">
                <button
                  onClick={() => setIsProfileModalOpen(true)}
                  className="w-full py-3 rounded-2xl bg-[#2C241D] hover:bg-[#3D3228] text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer"
                >
                  <Lock className="w-4 h-4 text-[#48A63E]" />
                  <span>Update Login Password</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  </div>

      {/* MODAL: TASK DETAIL & SPECIFICATIONS */}
      {isTaskDetailModalOpen && selectedTaskForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1A1410]/70 backdrop-blur-md animate-fadeIn">
          <div className="bg-white rounded-[2rem] p-6 sm:p-7 w-full max-w-2xl shadow-2xl border border-[#E2D7CB] space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#EFE7DE] pb-3">
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-mono font-black text-[#48A63E] bg-[#48A63E]/10 px-2.5 py-1 rounded-lg border border-[#48A63E]/20">
                  {selectedTaskForDetail.order_id}
                </span>
                <h3 className="text-lg font-black text-[#2C241D]">{selectedTaskForDetail.job_name}</h3>
              </div>
              <button onClick={() => setIsTaskDetailModalOpen(false)} className="p-1.5 text-[#7A6C5E] hover:text-[#2C241D] rounded-full hover:bg-[#FAF7F2]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-semibold">
              <div className="p-4 bg-[#FAF7F2] rounded-2xl border border-[#E2D7CB] grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <span className="block text-[10px] font-bold text-[#7A6C5E]">Assigned Stage:</span>
                  <span className="font-extrabold text-[#2C241D] text-sm">{selectedTaskForDetail.stage_name}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-[#7A6C5E]">Material:</span>
                  <span className="font-extrabold text-[#2C241D]">{selectedTaskForDetail.material}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-[#7A6C5E]">Dimensions:</span>
                  <span className="font-mono font-bold text-[#2C241D]">{selectedTaskForDetail.dimensions}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-[#7A6C5E]">Color / Finish:</span>
                  <span className="font-extrabold text-[#2C241D]">{selectedTaskForDetail.color}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-[#7A6C5E]">Status:</span>
                  <span className="font-extrabold text-[#38A132]">{selectedTaskForDetail.task_status}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-[#7A6C5E]">Priority:</span>
                  <span className="font-extrabold text-amber-700">{selectedTaskForDetail.priority}</span>
                </div>
              </div>

              <div>
                <h4 className="font-black text-[#2C241D] mb-1">Customer Requirements</h4>
                <p className="p-3 bg-[#FAF7F2] rounded-xl border border-[#E2D7CB] text-[#6B5C4D]">
                  {selectedTaskForDetail.customer_requirements}
                </p>
              </div>

              <div>
                <h4 className="font-black text-[#2C241D] mb-1">Technical Instructions from Production Staff</h4>
                <p className="p-3 bg-[#48A63E]/10 rounded-xl border border-[#48A63E]/30 text-[#2C241D]">
                  {selectedTaskForDetail.technical_instructions}
                </p>
              </div>

              {/* Reference Design Images Gallery */}
              {selectedTaskForDetail.reference_image && parseReferenceImages(selectedTaskForDetail.reference_image).length > 0 && (
                <div>
                  <h4 className="font-black text-[#2C241D] mb-1.5 flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-[#48A63E]" />
                    <span>Reference Design / Drawing Images</span>
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {parseReferenceImages(selectedTaskForDetail.reference_image).map((imgUrl, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => openImageInNewTab(imgUrl)}
                        className="group relative rounded-2xl overflow-hidden border border-[#E2D7CB] bg-[#FAF7F2] shadow-xs hover:shadow-md transition-all block h-36 text-left cursor-pointer w-full"
                      >
                        <img
                          src={imgUrl}
                          alt={`Reference Design ${i + 1}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-[#EFE7DE] flex items-center justify-end gap-3">
              {selectedTaskForDetail.task_status === 'ASSIGNED' && (
                <button
                  onClick={() => { handleStartTask(selectedTaskForDetail.task_id); setIsTaskDetailModalOpen(false); }}
                  className="px-5 py-2.5 rounded-xl bg-[#48A63E] hover:bg-[#3D9134] text-white font-extrabold text-xs shadow-md"
                >
                  Start Task Now
                </button>
              )}
              {selectedTaskForDetail.task_status === 'IN_PROGRESS' && (
                <button
                  onClick={() => { handleOpenCompleteModal(selectedTaskForDetail); }}
                  className="px-5 py-2.5 rounded-xl bg-[#48A63E] hover:bg-[#3D9134] text-white font-extrabold text-xs shadow-md flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Complete Stage</span>
                </button>
              )}
              <button
                onClick={() => setIsTaskDetailModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E2D7CB] text-[#2C241D] font-bold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: COMPLETE TASK */}
      {isCompleteModalOpen && selectedTaskForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1A1410]/70 backdrop-blur-md animate-fadeIn">
          <div className="bg-white rounded-[2rem] p-6 sm:p-7 w-full max-w-md shadow-2xl border border-[#E2D7CB] space-y-4">
            <div className="flex items-center justify-between border-b border-[#EFE7DE] pb-3">
              <h3 className="text-base font-extrabold text-[#2C241D]">Complete Production Stage</h3>
              <button onClick={() => setIsCompleteModalOpen(false)} className="p-1 text-[#7A6C5E] hover:text-[#2C241D]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitCompleteTask} className="space-y-3.5 text-xs font-semibold">
              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Stage Completion Remarks / Work Notes</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Timber framing and joinery completed according to dimensions. Prepared for surface sanding."
                  value={completeNotes}
                  onChange={(e) => setCompleteNotes(e.target.value)}
                  className="w-full p-3 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#48A63E]"
                  required
                />
              </div>

              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Finished Work Photo URL (Optional)</label>
                <input
                  type="text"
                  placeholder="https://... (URL of finished stage photo)"
                  value={completeWorkImages}
                  onChange={(e) => setCompleteWorkImages(e.target.value)}
                  className="w-full p-2.5 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl font-bold"
                />
              </div>

              <div className="pt-3 border-t border-[#EFE7DE] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCompleteModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E2D7CB] text-[#2C241D] font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingComplete}
                  className="px-5 py-2.5 rounded-xl bg-[#48A63E] hover:bg-[#3D9134] text-white font-extrabold text-xs shadow-md shadow-[#48A63E]/20"
                >
                  {isSubmittingComplete ? 'Saving...' : 'Confirm & Mark Completed'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REPORT ISSUE */}
      {isReportIssueModalOpen && selectedTaskForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1A1410]/70 backdrop-blur-md animate-fadeIn">
          <div className="bg-white rounded-[2rem] p-6 sm:p-7 w-full max-w-md shadow-2xl border border-[#E2D7CB] space-y-4">
            <div className="flex items-center justify-between border-b border-[#EFE7DE] pb-3">
              <h3 className="text-base font-extrabold text-[#2C241D] flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <span>Report Production Issue / Put On Hold</span>
              </h3>
              <button onClick={() => setIsReportIssueModalOpen(false)} className="p-1 text-[#7A6C5E] hover:text-[#2C241D]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitReportIssue} className="space-y-3.5 text-xs font-semibold">
              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Issue Category *</label>
                <select
                  value={issueType}
                  onChange={(e) => setIssueType(e.target.value)}
                  className="w-full p-2.5 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl font-bold text-[#2C241D]"
                >
                  <option value="Material Unavailable">Material Unavailable / Low Quality</option>
                  <option value="Design Discrepancy">Design Specification / Dimension Discrepancy</option>
                  <option value="Tool / Machine Defect">Tool / Equipment Failure</option>
                  <option value="Damage / Defect">Component Defect / Rework Needed</option>
                  <option value="Other">Other Operational Blocker</option>
                </select>
              </div>

              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Issue Description & Details *</label>
                <textarea
                  rows={3}
                  placeholder="Describe the issue preventing stage completion so Production Staff can assist..."
                  value={issueDescription}
                  onChange={(e) => setIssueDescription(e.target.value)}
                  className="w-full p-3 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl text-xs font-semibold focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div className="pt-3 border-t border-[#EFE7DE] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsReportIssueModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E2D7CB] text-[#2C241D] font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingIssue}
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs shadow-md"
                >
                  {isSubmittingIssue ? 'Submitting...' : 'Submit Issue & Put On Hold'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: UPDATE PASSWORD */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1A1410]/70 backdrop-blur-md animate-fadeIn">
          <div className="bg-white rounded-[2rem] p-6 sm:p-7 w-full max-w-md shadow-2xl border border-[#E2D7CB] space-y-4">
            <div className="flex items-center justify-between border-b border-[#EFE7DE] pb-3">
              <h3 className="text-base font-extrabold text-[#2C241D]">Update Worker Account Password</h3>
              <button onClick={() => setIsProfileModalOpen(false)} className="p-1 text-[#7A6C5E] hover:text-[#2C241D]">
                <X className="w-5 h-5" />
              </button>
            </div>

            {passwordNotice && (
              <div className={`p-3 rounded-xl text-xs font-bold border ${passwordNotice.type === 'success' ? 'bg-emerald-50 text-emerald-900 border-emerald-300' : 'bg-rose-50 text-rose-900 border-rose-300'}`}>
                {passwordNotice.text}
              </div>
            )}

            <form onSubmit={handlePasswordChangeSubmit} className="space-y-3 text-xs font-semibold">
              {!mustChangePasswordModal && (
                <div>
                  <label className="block font-extrabold text-[#2C241D] mb-1">Current Password *</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full p-2.5 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl font-bold"
                    required
                  />
                </div>
              )}
              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">New Password *</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full p-2.5 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl font-bold"
                  required
                />
              </div>
              <div>
                <label className="block font-extrabold text-[#2C241D] mb-1">Confirm New Password *</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full p-2.5 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl font-bold"
                  required
                />
              </div>

              <div className="pt-3 border-t border-[#EFE7DE] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsProfileModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#FAF7F2] border border-[#E2D7CB] text-[#2C241D] font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#48A63E] hover:bg-[#3D9134] text-white font-extrabold shadow-md"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkerDashboardPage;
