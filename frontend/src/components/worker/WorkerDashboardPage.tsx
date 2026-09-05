import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { clearUserSession } from '../../utils/sessionUtils';
import {
  LayoutDashboard,
  Hammer,
  Wrench,
  Clock,
  CheckCircle2,
  XCircle,
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
  Check,
  AlertCircle,
  Filter,
  Truck,
  MapPin,
  Calendar,
  Image as ImageIcon,
  CheckSquare,
  PackageCheck,
  Mail,
  Phone,
  Scissors,
  ShieldAlert,
  ExternalLink,
  Camera,
  Navigation,
  Box,
  Compass,
  ShoppingBag,
  Inbox,
  UserCheck
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
  fetchWorkerReworkJobsDB,
  resolveWorkerReworkJobDB,
  fetchWorkerDeliveriesDB,
  updateWorkerDeliveryStatusDB,
  WorkerSummaryData,
  WorkerTaskItem,
  WorkerCompletedHistoryItem,
  WorkerOnsiteJobItem,
  WorkerReworkItem,
  WorkerDeliveryItem
} from '../../services/api_worker';
import { getCurrentUser, updateUserProfile, changeFirstPassword, changePasswordUser } from '../../services/api';
import { applyWorkerLeave, fetchMyLeaveApplications, WorkerLeaveItem } from '../../services/api_leave';
import { parseReferenceImages, openImageInNewTab } from '../../utils/imageUtils';
import {
  getMessagesForUser,
  markAdminMessageRead,
  markAllAdminMessagesReadForUser,
  isMessageReadByUser,
  AdminMessage
} from '../../utils/adminMessagesStorage';
import { getStaffQueries, addStaffQuery, StaffQuery } from '../../utils/staffQueriesStorage';

export const WorkerDashboardPage: React.FC = () => {
  const navigate = useNavigate();

  // User Profile
  const [userProfile, setUserProfile] = useState<any>(null);

  // Summary & Workspace State
  const [summaryData, setSummaryData] = useState<WorkerSummaryData | null>(null);
  const [tasksList, setTasksList] = useState<WorkerTaskItem[]>([]);
  const [completedHistory, setCompletedHistory] = useState<WorkerCompletedHistoryItem[]>([]);
  const [onsiteJobsList, setOnsiteJobsList] = useState<WorkerOnsiteJobItem[]>([]);
  const [reworkList, setReworkList] = useState<WorkerReworkItem[]>([]);
  const [deliveriesList, setDeliveriesList] = useState<WorkerDeliveryItem[]>([]);
  const [leaveApplications, setLeaveApplications] = useState<WorkerLeaveItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Tabs & Navigation State
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'my_tasks' | 'onsite' | 'rework' | 'deliveries' | 'completed' | 'admin_messages' | 'queries' | 'leave'
  >('dashboard');
  const [taskStatusFilter, setTaskStatusFilter] = useState<string>('All');
  const [taskTypeFilter, setTaskTypeFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // Leave Form State
  const [leaveType, setLeaveType] = useState('Casual Leave');
  const [leaveStartDate, setLeaveStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [leaveEndDate, setLeaveEndDate] = useState(new Date(Date.now() + 86400000).toISOString().split('T')[0]);
  const [leaveReason, setLeaveReason] = useState('');
  const [isSubmittingLeave, setIsSubmittingLeave] = useState(false);

  // Directives & Queries State
  const [adminDirectives, setAdminDirectives] = useState<AdminMessage[]>([]);
  const [staffQueries, setStaffQueries] = useState<StaffQuery[]>([]);
  const [queryCategory, setQueryCategory] = useState<'Role & Access Permission' | 'General Query' | 'Email Change Request'>('General Query');
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
  const [isOnsiteModalOpen, setIsOnsiteModalOpen] = useState(false);
  const [onsiteNotes, setOnsiteNotes] = useState('');
  const [onsiteBeforePhoto, setOnsiteBeforePhoto] = useState('');
  const [onsiteAfterPhoto, setOnsiteAfterPhoto] = useState('');
  const [isSubmittingOnsite, setIsSubmittingOnsite] = useState(false);

  // Rework Modal State
  const [selectedReworkForDetail, setSelectedReworkForDetail] = useState<WorkerReworkItem | null>(null);
  const [isReworkModalOpen, setIsReworkModalOpen] = useState(false);
  const [reworkResolveNotes, setReworkResolveNotes] = useState('');
  const [isSubmittingRework, setIsSubmittingRework] = useState(false);

  // Delivery Modal State
  const [selectedDelivery, setSelectedDelivery] = useState<WorkerDeliveryItem | null>(null);
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [deliveryStatusInput, setDeliveryStatusInput] = useState('Out for Delivery');
  const [deliveryNotesInput, setDeliveryNotesInput] = useState('');
  const [isSubmittingDelivery, setIsSubmittingDelivery] = useState(false);

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
      const token = localStorage.getItem('access_token');
      if (!token) {
        navigate('/login', { replace: true });
        return;
      }

      const currentUser = await getCurrentUser();
      if (!currentUser) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        navigate('/login', { replace: true });
        return;
      }

      setUserProfile(currentUser);
      const email = currentUser.email || 'worker@retailsphere.ai';
      const role = (currentUser as any).role || 'Worker';
      if ((currentUser as any).must_change_password) {
        setMustChangePasswordModal(true);
      }

      // Load Broadcast Directives and Staff Communication Queries
      const msgs = getMessagesForUser(email, role);
      setAdminDirectives(msgs);

      const allQueries = getStaffQueries();
      const userQueries = allQueries.filter(
        (q) => !q.staffEmail || q.staffEmail.toLowerCase() === email.toLowerCase()
      );
      setStaffQueries(userQueries);

      const isDriver = Boolean((currentUser as any).is_driver);

      const [summary, tasks, history, onsite, leaves, reworks, deliveries] = await Promise.all([
        fetchWorkerSummaryDB(),
        fetchWorkerTasksDB(taskStatusFilter),
        fetchWorkerCompletedHistoryDB(),
        fetchWorkerOnsiteJobsDB(),
        fetchMyLeaveApplications(),
        fetchWorkerReworkJobsDB(),
        isDriver ? fetchWorkerDeliveriesDB() : Promise.resolve([])
      ]);

      if (summary) setSummaryData(summary);
      setTasksList(tasks || []);
      setCompletedHistory(history || []);
      setOnsiteJobsList(onsite || []);
      setLeaveApplications(leaves || []);
      setReworkList(reworks || []);
      setDeliveriesList(deliveries || []);
    } catch (err) {
      console.error('Failed to load worker workspace data:', err);
      setErrorNotice('Could not load latest workshop data. Please check connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkerWorkspaceData();
  }, [taskStatusFilter]);

  // Unread directives count
  const unreadAdminMsgsCount = useMemo(() => {
    if (!userProfile?.email) return 0;
    return adminDirectives.filter((m) => !isMessageReadByUser(m, userProfile.email)).length;
  }, [adminDirectives, userProfile]);

  // Active In-Progress Task (Hero on Home)
  const activeTask = useMemo(() => {
    return tasksList.find((t) => t.task_status === 'IN_PROGRESS') || null;
  }, [tasksList]);

  // Assigned Upcoming Queue
  const upcomingAssignedTasks = useMemo(() => {
    return tasksList.filter((t) => t.task_status === 'ASSIGNED');
  }, [tasksList]);

  // Filtered Tasks for My Tasks Tab
  const filteredTasks = useMemo(() => {
    return tasksList.filter((t) => {
      // Status Filter
      if (taskStatusFilter !== 'All' && t.task_status !== taskStatusFilter) {
        return false;
      }
      // Type Filter
      if (taskTypeFilter === 'Custom' && t.order_type !== 'Custom') return false;
      if (taskTypeFilter === 'Fabrication' && t.order_type !== 'Fabrication') return false;

      // Search Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchId = (t.order_id || '').toLowerCase().includes(q);
        const matchName = (t.job_name || '').toLowerCase().includes(q);
        const matchStage = (t.stage_name || '').toLowerCase().includes(q);
        const matchMat = (t.material || '').toLowerCase().includes(q);
        return matchId || matchName || matchStage || matchMat;
      }
      return true;
    });
  }, [tasksList, taskStatusFilter, taskTypeFilter, searchQuery]);

  // Handlers for Task Actions
  const handleStartTask = async (taskId: string) => {
    try {
      const res = await startWorkerTaskDB(taskId);
      setSuccessNotice(res.message || 'Task started successfully.');
      setIsTaskDetailModalOpen(false);
      await loadWorkerWorkspaceData();
    } catch (err: any) {
      setErrorNotice(err.message || 'Failed to start task.');
    }
  };

  const handleOpenCompleteModal = (task: WorkerTaskItem) => {
    setSelectedTaskForDetail(task);
    setCompleteNotes('');
    setCompleteWorkImages('');
    setCompleteProgressPct(100);
    setIsCompleteModalOpen(true);
  };

  const handleConfirmCompleteTask = async () => {
    if (!selectedTaskForDetail) return;
    setIsSubmittingComplete(true);
    try {
      const res = await completeWorkerTaskDB(selectedTaskForDetail.task_id, {
        notes: completeNotes,
        work_images: completeWorkImages,
        progress_percentage: completeProgressPct
      });
      setSuccessNotice(res.message || 'Task completed successfully.');
      setIsCompleteModalOpen(false);
      setIsTaskDetailModalOpen(false);
      await loadWorkerWorkspaceData();
    } catch (err: any) {
      setErrorNotice(err.message || 'Failed to complete task.');
    } finally {
      setIsSubmittingComplete(false);
    }
  };

  const handleOpenReportIssueModal = (task: WorkerTaskItem) => {
    setSelectedTaskForDetail(task);
    setIssueType('Material Unavailable');
    setIssueDescription('');
    setIssuePhotoUrl('');
    setIsReportIssueModalOpen(true);
  };

  const handleConfirmReportIssue = async () => {
    if (!selectedTaskForDetail || !issueDescription.trim()) return;
    setIsSubmittingIssue(true);
    try {
      const res = await reportWorkerTaskIssueDB(selectedTaskForDetail.task_id, {
        issue_type: issueType,
        description: issueDescription.trim(),
        photo_url: issuePhotoUrl.trim() || undefined
      });
      setSuccessNotice(res.message || 'Issue reported. Task moved to On Hold status.');
      setIsReportIssueModalOpen(false);
      setIsTaskDetailModalOpen(false);
      await loadWorkerWorkspaceData();
    } catch (err: any) {
      setErrorNotice(err.message || 'Failed to report issue.');
    } finally {
      setIsSubmittingIssue(false);
    }
  };

  // Handlers for Onsite Job
  const handleOpenOnsiteModal = (job: WorkerOnsiteJobItem) => {
    setSelectedOnsiteJob(job);
    setOnsiteNotes(job.customer_notes || '');
    setOnsiteBeforePhoto(job.before_photos || '');
    setOnsiteAfterPhoto(job.after_photos || '');
    setIsOnsiteModalOpen(true);
  };

  const handleUpdateOnsiteStatus = async (newStatus: string) => {
    if (!selectedOnsiteJob) return;
    setIsSubmittingOnsite(true);
    try {
      const res = await updateWorkerOnsiteJobStatusDB(selectedOnsiteJob.job_id, {
        status: newStatus,
        customer_notes: onsiteNotes,
        before_photos: onsiteBeforePhoto,
        after_photos: onsiteAfterPhoto
      });
      setSuccessNotice(res.message || `On-site job status updated to ${newStatus}.`);
      setIsOnsiteModalOpen(false);
      await loadWorkerWorkspaceData();
    } catch (err: any) {
      setErrorNotice(err.message || 'Failed to update on-site job.');
    } finally {
      setIsSubmittingOnsite(false);
    }
  };

  // Handlers for QC Rework
  const handleOpenReworkModal = (rw: WorkerReworkItem) => {
    setSelectedReworkForDetail(rw);
    setReworkResolveNotes('');
    setIsReworkModalOpen(true);
  };

  const handleConfirmResolveRework = async () => {
    if (!selectedReworkForDetail) return;
    setIsSubmittingRework(true);
    try {
      const res = await resolveWorkerReworkJobDB(selectedReworkForDetail.rework_id, reworkResolveNotes);
      setSuccessNotice(res.message || 'Rework marked as resolved and submitted for re-inspection.');
      setIsReworkModalOpen(false);
      await loadWorkerWorkspaceData();
    } catch (err: any) {
      setErrorNotice(err.message || 'Failed to resolve rework.');
    } finally {
      setIsSubmittingRework(false);
    }
  };

  // Handlers for Driver Delivery
  const handleOpenDeliveryModal = (del: WorkerDeliveryItem) => {
    setSelectedDelivery(del);
    setDeliveryStatusInput(del.delivery_status || 'Out for Delivery');
    setDeliveryNotesInput(del.delivery_notes || '');
    setIsDeliveryModalOpen(true);
  };

  const handleConfirmUpdateDelivery = async () => {
    if (!selectedDelivery) return;
    setIsSubmittingDelivery(true);
    try {
      const res = await updateWorkerDeliveryStatusDB(selectedDelivery.fulfillment_id, {
        status: deliveryStatusInput,
        notes: deliveryNotesInput
      });
      setSuccessNotice(res.message || `Delivery status updated to ${deliveryStatusInput}.`);
      setIsDeliveryModalOpen(false);
      await loadWorkerWorkspaceData();
    } catch (err: any) {
      setErrorNotice(err.message || 'Failed to update delivery status.');
    } finally {
      setIsSubmittingDelivery(false);
    }
  };

  // Handlers for Leave
  const handleSubmitLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveReason.trim()) {
      setErrorNotice('Please provide a reason for the leave application.');
      return;
    }
    setIsSubmittingLeave(true);
    try {
      await applyWorkerLeave({
        leave_type: leaveType,
        start_date: leaveStartDate,
        end_date: leaveEndDate,
        reason: leaveReason
      });
      setSuccessNotice('Leave application submitted successfully.');
      setLeaveReason('');
      const updatedLeaves = await fetchMyLeaveApplications();
      setLeaveApplications(updatedLeaves || []);
    } catch (err: any) {
      setErrorNotice(err.message || 'Failed to submit leave application.');
    } finally {
      setIsSubmittingLeave(false);
    }
  };

  // Handlers for Staff Query
  const handleSubmitQuery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!querySubject.trim() || !queryMessage.trim()) return;
    setIsSubmittingQuery(true);
    try {
      addStaffQuery({
        staffName: userProfile?.full_name || 'Artisan Worker',
        staffEmail: userProfile?.email || 'worker@retailsphere.ai',
        category: queryCategory,
        subject: querySubject.trim(),
        message: queryMessage.trim()
      });
      setSuccessNotice('Your inquiry has been submitted to production supervisors.');
      setQuerySubject('');
      setQueryMessage('');
      const allQueries = getStaffQueries();
      const userQueries = allQueries.filter(
        (q) => !q.staffEmail || q.staffEmail.toLowerCase() === (userProfile?.email || '').toLowerCase()
      );
      setStaffQueries(userQueries);
    } catch (err: any) {
      setErrorNotice('Failed to submit inquiry.');
    } finally {
      setIsSubmittingQuery(false);
    }
  };

  // Password Change Handler
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordNotice(null);
    if (newPassword.length < 6) {
      setPasswordNotice({ type: 'error', text: 'New password must be at least 6 characters long.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordNotice({ type: 'error', text: 'New password and confirmation do not match.' });
      return;
    }

    try {
      if (mustChangePasswordModal) {
        await changeFirstPassword(currentPassword, newPassword);
        setMustChangePasswordModal(false);
      } else {
        await changePasswordUser(currentPassword, newPassword);
      }
      setPasswordNotice({ type: 'success', text: 'Password successfully updated!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setIsProfileModalOpen(false);
        setPasswordNotice(null);
      }, 2000);
    } catch (err: any) {
      setPasswordNotice({ type: 'error', text: err.message || 'Failed to update password.' });
    }
  };

  const handleLogout = () => {
    clearUserSession();
    navigate('/login', { replace: true });
  };

  return (
    <div className="relative min-h-screen text-[#2C241D] flex selection:bg-[#48A63E] selection:text-white overflow-x-hidden">
      {/* Background Image Layer (Matching Production & Retail Dashboards) */}
      <div
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat transition-all duration-700 pointer-events-none scale-105"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=2000&q=80')`,
        }}
      />
      {/* Translucent Warm Cream Overlay Layer */}
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-[#FAF7F2]/45 via-[#F3EDE5]/35 to-[#EAE1D5]/50 pointer-events-none" />

      {/* ========================================================================= */}
      {/* 1. LEFT SIDEBAR (Standard RetailSphere AI Staff Layout)                  */}
      {/* ========================================================================= */}
      <aside className="w-72 ultra-glass-panel border-r border-[#E2D7CB] hidden md:flex flex-col justify-between p-6 shadow-xl sticky top-0 h-screen min-h-screen z-20 flex-shrink-0">
        <div className="space-y-8">
          {/* Brand Logo */}
          <div className="flex items-center justify-between">
            <div>
              <Link to="/dashboard" className="font-extrabold text-[#2C241D] text-lg tracking-tight block hover:opacity-90 transition-opacity">
                RetailSphere <span className="text-[#48A63E]">AI</span>
              </Link>
              <span className="text-[10px] font-extrabold text-[#48A63E] uppercase tracking-widest block font-mono -mt-0.5">
                Worker Artisan Portal
              </span>
            </div>
          </div>

          {/* Sidebar Scrollable Navigation */}
          <div className="overflow-y-auto max-h-[calc(100vh-160px)] pr-1 space-y-5 scrollbar-none">
            {/* Category 1: Workshop Operations */}
            <div>
              <div className="text-[10px] font-black uppercase text-[#7A6C5E] tracking-wider mb-2 px-2">
                Workshop Operations
              </div>
              <nav className="space-y-1 text-xs font-bold">
                {[
                  { id: 'dashboard', label: 'Dashboard Overview', icon: LayoutDashboard },
                  {
                    id: 'my_tasks',
                    label: 'My Workshop Tasks',
                    icon: Hammer,
                    badge: summaryData ? summaryData.active_tasks_count + summaryData.pending_tasks_count : tasksList.filter(t => t.task_status !== 'COMPLETED').length,
                    badgeColor: 'bg-emerald-600'
                  },
                  {
                    id: 'completed',
                    label: 'Completed History',
                    icon: CheckCircle2,
                    badge: summaryData?.completed_today_count,
                    badgeColor: 'bg-teal-600'
                  }
                ].map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id as any)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all cursor-pointer ${
                        isActive
                          ? 'bg-[#38A132] text-white shadow-md shadow-[#38A132]/20 font-extrabold'
                          : 'text-[#5C4E42] hover:text-[#2C241D] hover:bg-[#F5ECE1]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && item.badge > 0 ? (
                        <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded-full text-white ${item.badgeColor || 'bg-emerald-600'}`}>
                          {item.badge}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Category 2: Field & Quality Services */}
            <div>
              <div className="text-[10px] font-black uppercase text-[#7A6C5E] tracking-wider mb-2 px-2">
                Field & Quality Services
              </div>
              <nav className="space-y-1 text-xs font-bold">
                {[
                  {
                    id: 'onsite',
                    label: 'On-Site Field Jobs',
                    icon: MapPin,
                    badge: summaryData?.onsite_jobs_count || onsiteJobsList.filter(j => j.status !== 'COMPLETED').length,
                    badgeColor: 'bg-blue-600'
                  },
                  {
                    id: 'rework',
                    label: 'QC Rework Tickets',
                    icon: AlertTriangle,
                    badge: summaryData?.rework_jobs_count || reworkList.filter(r => r.status !== 'RESOLVED').length,
                    badgeColor: 'bg-purple-600'
                  }
                ].map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id as any)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all cursor-pointer ${
                        isActive
                          ? 'bg-[#38A132] text-white shadow-md shadow-[#38A132]/20 font-extrabold'
                          : 'text-[#5C4E42] hover:text-[#2C241D] hover:bg-[#F5ECE1]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && item.badge > 0 ? (
                        <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded-full text-white ${item.badgeColor || 'bg-purple-600'}`}>
                          {item.badge}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Category 3: Logistics & Fleet (Strictly Conditional on is_driver) */}
            {userProfile?.is_driver && (
              <div>
                <div className="text-[10px] font-black uppercase text-[#7A6C5E] tracking-wider mb-2 px-2 flex items-center justify-between">
                  <span>Logistics & Fleet</span>
                  <span className="text-[9px] px-1.5 py-0.2 bg-amber-500 text-white rounded-sm font-mono">DRIVER</span>
                </div>
                <nav className="space-y-1 text-xs font-bold">
                  {[
                    {
                      id: 'deliveries',
                      label: 'Driver Deliveries',
                      icon: Truck,
                      badge: summaryData?.driver_deliveries_count || deliveriesList.filter(d => d.fulfillment_status !== 'Delivered').length,
                      badgeColor: 'bg-indigo-600'
                    }
                  ].map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id as any)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all cursor-pointer ${
                          isActive
                            ? 'bg-[#38A132] text-white shadow-md shadow-[#38A132]/20 font-extrabold'
                            : 'text-[#5C4E42] hover:text-[#2C241D] hover:bg-[#F5ECE1]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon className="w-4 h-4" />
                          <span>{item.label}</span>
                        </div>
                        {item.badge && item.badge > 0 ? (
                          <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded-full text-white ${item.badgeColor || 'bg-indigo-600'}`}>
                            {item.badge}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </nav>
              </div>
            )}

            {/* Category 4: Support & Availability */}
            <div>
              <div className="text-[10px] font-black uppercase text-[#7A6C5E] tracking-wider mb-2 px-2">
                Support & Availability
              </div>
              <nav className="space-y-1 text-xs font-bold">
                {[
                  {
                    id: 'admin_messages',
                    label: 'Admin Directives',
                    icon: Mail,
                    badge: unreadAdminMsgsCount,
                    badgeColor: 'bg-amber-500 animate-pulse'
                  },
                  { id: 'queries', label: 'Supervisor Inquiries', icon: MessageSquare },
                  {
                    id: 'leave',
                    label: 'Leave Applications',
                    icon: Clock,
                    badge: leaveApplications.filter(l => l.status === 'Pending').length,
                    badgeColor: 'bg-amber-600'
                  }
                ].map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id as any)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all cursor-pointer ${
                        isActive
                          ? 'bg-[#38A132] text-white shadow-md shadow-[#38A132]/20 font-extrabold'
                          : 'text-[#5C4E42] hover:text-[#2C241D] hover:bg-[#F5ECE1]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && item.badge > 0 ? (
                        <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded-full text-white ${item.badgeColor || 'bg-amber-600'}`}>
                          {item.badge}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* 2. RIGHT MAIN CONTENT AREA                                                */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Mobile Top Navigation */}
        <div className="md:hidden bg-[#FAF7F2] border-b border-[#E6E1DA] p-3 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-xs text-[#2C241D]">Worker Portal</span>
            <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-[#E8F5E9] text-[#2D6338] rounded-md">
              {userProfile?.specialization || 'Production'}
            </span>
          </div>
          <select
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value as any)}
            className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-white border border-[#E2D7CB] text-[#2C241D]"
          >
            <option value="dashboard">📊 Dashboard Overview</option>
            <option value="my_tasks">🔨 Workshop Tasks</option>
            <option value="onsite">📍 On-Site Jobs</option>
            <option value="rework">⚠️ QC Rework</option>
            {userProfile?.is_driver && <option value="deliveries">🚚 Driver Deliveries</option>}
            <option value="completed">✅ Completed History</option>
            <option value="admin_messages">📢 Directives</option>
            <option value="queries">💬 Supervisor Inquiries</option>
            <option value="leave">📅 Leave Applications</option>
          </select>
        </div>

        {/* Main Content Container */}
        <main className="p-3 sm:p-5 lg:p-6 space-y-6 max-w-7xl w-full mx-auto">
          <div className="ultra-glass-panel rounded-[2.5rem] p-4 sm:p-6 lg:p-6 space-y-6 relative">
            <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-white/60 via-white/20 to-transparent pointer-events-none rounded-t-[2.5rem]" />

            {/* Top Notifications Banner */}
            {successNotice && (
              <div className="relative z-10 p-4 rounded-2xl bg-[#48A63E]/15 border border-[#48A63E]/40 text-[#48A63E] flex items-start gap-3 shadow-md animate-fadeIn">
                <CheckCircle2 className="w-5 h-5 text-[#48A63E] flex-shrink-0 mt-0.5" />
                <div className="flex-1 text-xs font-extrabold leading-relaxed">
                  {successNotice}
                </div>
                <button onClick={() => setSuccessNotice(null)} className="text-[#48A63E] hover:text-[#3D9134] p-1 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {errorNotice && (
              <div className="relative z-10 p-4 rounded-2xl bg-red-500/15 border border-red-500/40 text-red-700 flex items-start gap-3 shadow-md animate-fadeIn">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 text-xs font-extrabold leading-relaxed">
                  {errorNotice}
                </div>
                <button onClick={() => setErrorNotice(null)} className="text-red-700 hover:text-red-900 p-1 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Unread Admin Directives Banner */}
            {unreadAdminMsgsCount > 0 && activeTab !== 'admin_messages' && (
              <div className="relative z-10 p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-amber-500/5 border-2 border-amber-400 text-amber-900 flex items-center justify-between gap-3 shadow-md animate-fadeIn">
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-amber-600 animate-bounce flex-shrink-0" />
                  <div>
                    <span className="font-black text-xs block">
                      📢 You have {unreadAdminMsgsCount} unread Supervisor Directive{unreadAdminMsgsCount > 1 ? 's' : ''}!
                    </span>
                    <span className="text-[11px] text-amber-800 font-medium">
                      Workshop supervisors dispatched official instructions for active manufacturing operations.
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('admin_messages')}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs shadow-xs transition-all whitespace-nowrap cursor-pointer"
                >
                  View Directives →
                </button>
              </div>
            )}

            {/* Top Workspace Bar (Elevated z-index for dropdown stacking) */}
            <div className="relative z-30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#E2D7CB]">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black text-[#2C241D] tracking-tight">
                    {activeTab === 'dashboard' && 'Workshop Execution Center'}
                    {activeTab === 'my_tasks' && 'My Assigned Manufacturing Stages'}
                    {activeTab === 'onsite' && 'On-Site Field Service Assignments'}
                    {activeTab === 'rework' && 'Quality Control & Rework Tickets'}
                    {activeTab === 'deliveries' && 'Driver Logistics & Order Delivery'}
                    {activeTab === 'completed' && 'Completed Workshop History'}
                    {activeTab === 'admin_messages' && 'Supervisor Directives & Broadcasts'}
                    {activeTab === 'queries' && 'Technical Queries & Material Requests'}
                    {activeTab === 'leave' && 'Leave Management & Absence Tracking'}
                  </h1>
                </div>
                <p className="text-xs text-[#7A6C5E] font-medium mt-0.5 flex items-center gap-2 flex-wrap">
                  <span>Artisan ID: #{userProfile?.user_id || '104'}</span>
                  <span>•</span>
                  <span>Specialization: <strong className="text-[#2C241D]">{userProfile?.specialization || 'Joinery & Assembly'}</strong></span>
                  {userProfile?.is_driver && (
                    <>
                      <span>•</span>
                      <span className="px-2 py-0.5 rounded-md bg-amber-500 text-white font-bold text-[10px]">
                        Driver Capable
                      </span>
                    </>
                  )}
                </p>
              </div>

              {/* Top Controls: Staff Name Dropdown Pill Matching Other Dashboards */}
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <div className="relative">
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(!isUserMenuOpen);
                    }}
                    className="flex items-center gap-2.5 px-3 py-1.5 rounded-2xl bg-white border border-[#E2D7CB] hover:border-[#48A63E] transition-all shadow-xs cursor-pointer"
                    title="Click for profile and sign out options"
                  >
                    <div className="w-7 h-7 rounded-xl bg-gradient-to-r from-[#48A63E] to-[#3D9134] text-white font-extrabold text-xs flex items-center justify-center flex-shrink-0 shadow-md">
                      {(userProfile?.full_name || 'Worker').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <span className="text-xs font-extrabold text-[#2C241D]">
                      {userProfile?.full_name || 'Worker'}
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 text-[#6B5C4D] transition-transform ${isUserMenuOpen ? 'rotate-180 text-[#48A63E]' : ''}`} />
                  </button>

                  {isUserMenuOpen && (
                    <>
                      {/* Invisible backdrop to handle click-outside */}
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsUserMenuOpen(false)}
                      />
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
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* ===================================================================== */}
            {/* KPI METRICS RIBBON (Matching Retail/Production Staff Dashboards)       */}
            {/* ===================================================================== */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 relative z-10">
              {/* Metric 1: Active In-Progress Task */}
              <div
                onClick={() => setActiveTab('my_tasks')}
                className="bg-white/90 p-3.5 sm:p-4 rounded-2xl border border-[#E2D7CB] shadow-2xs hover:shadow-md transition-all cursor-pointer flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-[#38A132]/10 text-[#38A132] flex items-center justify-center shrink-0">
                  <Hammer className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-lg sm:text-xl font-black text-[#2C241D]">
                    {summaryData?.active_tasks_count || 0}
                  </div>
                  <div className="text-[10px] sm:text-[11px] font-bold text-[#7A6C5E] truncate">
                    Active Workshop
                  </div>
                </div>
              </div>

              {/* Metric 2: Pending Assigned Tasks */}
              <div
                onClick={() => setActiveTab('my_tasks')}
                className="bg-white/90 p-3.5 sm:p-4 rounded-2xl border border-[#E2D7CB] shadow-2xs hover:shadow-md transition-all cursor-pointer flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-lg sm:text-xl font-black text-[#2C241D]">
                    {summaryData?.pending_tasks_count || 0}
                  </div>
                  <div className="text-[10px] sm:text-[11px] font-bold text-[#7A6C5E] truncate">
                    Pending Queue
                  </div>
                </div>
              </div>

              {/* Metric 3: Completed Today */}
              <div
                onClick={() => setActiveTab('completed')}
                className="bg-white/90 p-3.5 sm:p-4 rounded-2xl border border-[#E2D7CB] shadow-2xs hover:shadow-md transition-all cursor-pointer flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-700 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-lg sm:text-xl font-black text-[#2C241D]">
                    {summaryData?.completed_today_count || 0}
                  </div>
                  <div className="text-[10px] sm:text-[11px] font-bold text-[#7A6C5E] truncate">
                    Done Today
                  </div>
                </div>
              </div>

              {/* Metric 4: On-Site Field Jobs */}
              <div
                onClick={() => setActiveTab('onsite')}
                className="bg-white/90 p-3.5 sm:p-4 rounded-2xl border border-[#E2D7CB] shadow-2xs hover:shadow-md transition-all cursor-pointer flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-700 flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-lg sm:text-xl font-black text-[#2C241D]">
                    {summaryData?.onsite_jobs_count || 0}
                  </div>
                  <div className="text-[10px] sm:text-[11px] font-bold text-[#7A6C5E] truncate">
                    On-Site Jobs
                  </div>
                </div>
              </div>

              {/* Metric 5: QC Rework Tickets */}
              <div
                onClick={() => setActiveTab('rework')}
                className="bg-white/90 p-3.5 sm:p-4 rounded-2xl border border-[#E2D7CB] shadow-2xs hover:shadow-md transition-all cursor-pointer flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-700 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-lg sm:text-xl font-black text-[#2C241D]">
                    {summaryData?.rework_jobs_count || 0}
                  </div>
                  <div className="text-[10px] sm:text-[11px] font-bold text-[#7A6C5E] truncate">
                    QC Rework
                  </div>
                </div>
              </div>

              {/* Metric 6: Driver Deliveries (or Leave Status if not driver) */}
              {userProfile?.is_driver ? (
                <div
                  onClick={() => setActiveTab('deliveries')}
                  className="bg-white/90 p-3.5 sm:p-4 rounded-2xl border border-[#E2D7CB] shadow-2xs hover:shadow-md transition-all cursor-pointer flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-700 flex items-center justify-center shrink-0">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-lg sm:text-xl font-black text-[#2C241D]">
                      {summaryData?.driver_deliveries_count || 0}
                    </div>
                    <div className="text-[10px] sm:text-[11px] font-bold text-[#7A6C5E] truncate">
                      Driver Deliveries
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => setActiveTab('leave')}
                  className="bg-white/90 p-3.5 sm:p-4 rounded-2xl border border-[#E2D7CB] shadow-2xs hover:shadow-md transition-all cursor-pointer flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-700 flex items-center justify-center shrink-0">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-lg sm:text-xl font-black text-[#2C241D]">
                      {leaveApplications.filter(l => l.status === 'Pending').length}
                    </div>
                    <div className="text-[10px] sm:text-[11px] font-bold text-[#7A6C5E] truncate">
                      Pending Leaves
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ===================================================================== */}
            {/* 3. TAB 1: DASHBOARD OVERVIEW (HOME)                                   */}
            {/* ===================================================================== */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6 relative z-10 animate-fadeIn">
                {/* A. CURRENT ACTIVE WORKSHOP TASK HERO */}
                <div className="bg-white/95 rounded-3xl border border-[#E2D7CB] p-5 sm:p-6 shadow-xs relative overflow-hidden">
                  <div className="flex items-center justify-between pb-4 border-b border-[#EFE7DE] mb-5">
                    <div className="flex items-center gap-2.5">
                      <span className="w-3 h-3 rounded-full bg-[#38A132] animate-pulse" />
                      <h2 className="text-base sm:text-lg font-black text-[#2C241D]">
                        Active Workshop Execution
                      </h2>
                    </div>
                    {activeTask && (
                      <span className="px-3 py-1 rounded-full bg-[#E8F5E9] text-[#2D6338] text-xs font-black uppercase tracking-wider border border-[#A5D6A7]">
                        Stage In Progress
                      </span>
                    )}
                  </div>

                  {activeTask ? (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                      {/* Left: Design Reference Image / Preview */}
                      <div className="lg:col-span-4 bg-[#FAF7F2] rounded-2xl p-3 border border-[#E2D7CB] space-y-2">
                        <div className="relative h-48 w-full bg-[#EFE8DC] rounded-xl overflow-hidden flex items-center justify-center border border-[#D6C9B9]">
                          {activeTask.reference_image ? (
                            <img
                              src={activeTask.reference_image}
                              alt={activeTask.job_name}
                              className="w-full h-full object-contain cursor-pointer hover:scale-105 transition-transform"
                              onClick={() => {
                                if (activeTask.reference_image) {
                                  openImageInNewTab(activeTask.reference_image);
                                }
                              }}
                            />
                          ) : (
                            <div className="text-center p-4 text-[#7A6C5E]">
                              <ImageIcon className="w-10 h-10 mx-auto mb-1 opacity-40" />
                              <span className="text-[11px] font-bold">Standard Workshop Blueprint</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center justify-between text-[11px] font-bold text-[#7A6C5E] px-1">
                          <span>{activeTask.order_type} Order</span>
                          <span className="font-mono text-[#B89768] font-black">{activeTask.order_id}</span>
                        </div>
                      </div>

                      {/* Middle: Technical Job Specs */}
                      <div className="lg:col-span-5 space-y-3">
                        <div>
                          <span className="text-[10px] font-mono uppercase tracking-widest text-[#B89768] font-black bg-[#EFE8DC] px-2.5 py-0.5 rounded-md border border-[#D6C9B9]">
                            {activeTask.order_id} • Stage: {activeTask.stage_name}
                          </span>
                          <h3 className="text-base sm:text-lg font-black text-[#2C241D] mt-1.5 leading-snug">
                            {activeTask.job_name}
                          </h3>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="p-2.5 rounded-xl bg-[#FAF7F2] border border-[#E2D7CB]">
                            <span className="text-[10px] text-[#7A6C5E] uppercase font-bold block">Dimensions</span>
                            <span className="font-extrabold text-[#2C241D]">{activeTask.dimensions || 'Standard Specification'}</span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-[#FAF7F2] border border-[#E2D7CB]">
                            <span className="text-[10px] text-[#7A6C5E] uppercase font-bold block">Timber / Material</span>
                            <span className="font-extrabold text-[#2C241D]">{activeTask.material || 'Solid Hardwood'}</span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-[#FAF7F2] border border-[#E2D7CB]">
                            <span className="text-[10px] text-[#7A6C5E] uppercase font-bold block">Finish & Color</span>
                            <span className="font-extrabold text-[#2C241D]">{activeTask.color || 'Natural Walnut'}</span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-[#FAF7F2] border border-[#E2D7CB]">
                            <span className="text-[10px] text-[#7A6C5E] uppercase font-bold block">Required Skill</span>
                            <span className="font-extrabold text-[#2C241D]">{activeTask.required_skill || 'Joinery'}</span>
                          </div>
                        </div>

                        {activeTask.technical_instructions && (
                          <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900">
                            <strong className="font-extrabold block text-[10px] uppercase text-amber-800">Technician Instructions:</strong>
                            {activeTask.technical_instructions}
                          </div>
                        )}
                      </div>

                      {/* Right: Operational Actions */}
                      <div className="lg:col-span-3 space-y-3 flex flex-col justify-between h-full bg-[#FAF7F2] p-4 rounded-2xl border border-[#E2D7CB]">
                        <div>
                          <span className="text-[10px] font-black uppercase text-[#7A6C5E] block mb-1">
                            Build Stage Progress
                          </span>
                          <div className="w-full bg-[#E2D7CB] rounded-full h-2.5 overflow-hidden mb-2">
                            <div
                              className="bg-[#38A132] h-2.5 rounded-full transition-all duration-500"
                              style={{ width: `${activeTask.progress_percentage || 50}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-[11px] font-bold text-[#7A6C5E]">
                            <span>Started: {activeTask.started_at ? new Date(activeTask.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Today'}</span>
                            <span className="font-extrabold text-[#38A132]">{activeTask.progress_percentage || 50}%</span>
                          </div>
                        </div>

                        <div className="space-y-2 pt-2">
                          <button
                            onClick={() => handleOpenCompleteModal(activeTask)}
                            className="w-full py-2.5 rounded-xl bg-[#38A132] hover:bg-[#2F8829] text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-[#38A132]/20 transition-all cursor-pointer"
                          >
                            <Check className="w-4 h-4" />
                            <span>Complete Stage</span>
                          </button>
                          <button
                            onClick={() => handleOpenReportIssueModal(activeTask)}
                            className="w-full py-2 rounded-xl bg-white hover:bg-amber-50 text-amber-800 border border-amber-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                          >
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                            <span>Report Issue / Hold</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-12 text-center space-y-3">
                      <div className="w-14 h-14 rounded-2xl bg-[#FAF7F2] border border-[#E2D7CB] flex items-center justify-center mx-auto text-[#7A6C5E]">
                        <Hammer className="w-7 h-7 opacity-40" />
                      </div>
                      <div className="max-w-md mx-auto">
                        <h4 className="text-sm font-extrabold text-[#2C241D]">No Stage Currently In Progress</h4>
                        <p className="text-xs text-[#7A6C5E] mt-1">
                          You do not have an active workshop task in progress right now. Review the upcoming queue below or check your assigned tasks to begin work.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* B. UPCOMING ASSIGNED STAGES QUEUE */}
                <div className="bg-white/95 rounded-3xl border border-[#E2D7CB] p-5 sm:p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[#EFE7DE]">
                    <h3 className="text-sm sm:text-base font-black text-[#2C241D] flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-600" />
                      <span>Upcoming Assigned Manufacturing Stages</span>
                    </h3>
                    <button
                      onClick={() => setActiveTab('my_tasks')}
                      className="text-xs font-bold text-[#38A132] hover:text-[#2F8829] flex items-center gap-1 cursor-pointer"
                    >
                      <span>View All Tasks ({tasksList.length})</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {upcomingAssignedTasks.length === 0 ? (
                    <div className="py-8 text-center text-xs text-[#7A6C5E]">
                      No pending assigned stages in queue. You are completely caught up!
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-[#E2D7CB] text-[#7A6C5E] font-black uppercase text-[10px] tracking-wider bg-[#FAF7F2]">
                            <th className="py-2.5 px-3 rounded-l-xl">Order Ref</th>
                            <th className="py-2.5 px-3">Product / Job</th>
                            <th className="py-2.5 px-3">Stage</th>
                            <th className="py-2.5 px-3">Type</th>
                            <th className="py-2.5 px-3">Priority</th>
                            <th className="py-2.5 px-3">Assigned Date</th>
                            <th className="py-2.5 px-3 text-right rounded-r-xl">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#EFE7DE] font-medium text-[#2C241D]">
                          {upcomingAssignedTasks.slice(0, 5).map((task) => (
                            <tr key={task.task_id} className="hover:bg-[#FAF7F2] transition-colors">
                              <td className="py-3 px-3 font-mono font-bold text-[#B89768]">
                                {task.order_id}
                              </td>
                              <td className="py-3 px-3 font-extrabold text-[#2C241D]">
                                {task.job_name}
                              </td>
                              <td className="py-3 px-3">
                                <span className="px-2 py-0.5 rounded-md bg-[#FAF7F2] border border-[#E2D7CB] font-bold text-[11px]">
                                  {task.stage_name}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-[11px] text-[#7A6C5E]">
                                {task.order_type}
                              </td>
                              <td className="py-3 px-3">
                                <span className={`px-2 py-0.5 rounded-md font-black text-[10px] uppercase ${
                                  task.priority === 'URGENT' ? 'bg-red-100 text-red-700' :
                                  task.priority === 'HIGH' ? 'bg-amber-100 text-amber-800' :
                                  'bg-slate-100 text-slate-700'
                                }`}>
                                  {task.priority}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-[11px] text-[#7A6C5E]">
                                {task.assigned_date ? new Date(task.assigned_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : 'Today'}
                              </td>
                              <td className="py-3 px-3 text-right">
                                <button
                                  onClick={() => handleStartTask(task.task_id)}
                                  className="px-3 py-1 rounded-lg bg-[#38A132] hover:bg-[#2F8829] text-white font-extrabold text-[11px] transition-all cursor-pointer shadow-2xs"
                                >
                                  Start Stage
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* C. FIELD SERVICE & REWORK GLANCE GRID */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* On-Site Appointments Glance */}
                  <div className="bg-white/95 rounded-3xl border border-[#E2D7CB] p-5 shadow-xs space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-[#EFE7DE]">
                      <h3 className="text-xs font-black uppercase tracking-wider text-[#2C241D] flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-blue-600" />
                        <span>Scheduled On-Site Appointments</span>
                      </h3>
                      <button
                        onClick={() => setActiveTab('onsite')}
                        className="text-[11px] font-bold text-[#38A132] hover:underline cursor-pointer"
                      >
                        View All ({onsiteJobsList.length})
                      </button>
                    </div>

                    {onsiteJobsList.length === 0 ? (
                      <div className="py-6 text-center text-xs text-[#7A6C5E]">
                        No on-site service appointments assigned.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {onsiteJobsList.slice(0, 3).map((job) => (
                          <div key={job.job_id} className="p-3 bg-[#FAF7F2] rounded-2xl border border-[#E2D7CB] flex items-center justify-between text-xs">
                            <div>
                              <div className="font-extrabold text-[#2C241D]">{job.customer_name} • {job.service_category}</div>
                              <div className="text-[11px] text-[#7A6C5E] truncate max-w-xs">{job.address}</div>
                            </div>
                            <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold text-[10px]">
                              {job.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* QC Rework Glance */}
                  <div className="bg-white/95 rounded-3xl border border-[#E2D7CB] p-5 shadow-xs space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-[#EFE7DE]">
                      <h3 className="text-xs font-black uppercase tracking-wider text-[#2C241D] flex items-center gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-purple-600" />
                        <span>Assigned QC Rework Defects</span>
                      </h3>
                      <button
                        onClick={() => setActiveTab('rework')}
                        className="text-[11px] font-bold text-[#38A132] hover:underline cursor-pointer"
                      >
                        View All ({reworkList.length})
                      </button>
                    </div>

                    {reworkList.length === 0 ? (
                      <div className="py-6 text-center text-xs text-[#7A6C5E]">
                        No active QC rework tickets assigned. Quality standards 100%!
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {reworkList.slice(0, 3).map((rw) => (
                          <div key={rw.rework_id} className="p-3 bg-[#FAF7F2] rounded-2xl border border-[#E2D7CB] flex items-center justify-between text-xs">
                            <div>
                              <div className="font-extrabold text-[#2C241D]">{rw.order_id} • {rw.order_title}</div>
                              <div className="text-[11px] text-red-600 font-bold truncate max-w-xs">{rw.rework_reason}</div>
                            </div>
                            <button
                              onClick={() => handleOpenReworkModal(rw)}
                              className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-[10px] cursor-pointer"
                            >
                              Inspect
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ===================================================================== */}
            {/* 4. TAB 2: MY WORKSHOP TASKS                                           */}
            {/* ===================================================================== */}
            {activeTab === 'my_tasks' && (
              <div className="space-y-4 relative z-10 animate-fadeIn">
                {/* Search & Filter Bar */}
                <div className="bg-white/95 p-4 rounded-2xl border border-[#E2D7CB] shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-[#7A6C5E] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search tasks by order ID, product name, or material..."
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E2D7CB] text-xs font-bold text-[#2C241D] placeholder:text-[#7A6C5E] focus:outline-none focus:border-[#38A132]"
                    />
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Category Filter */}
                    <select
                      value={taskTypeFilter}
                      onChange={(e) => setTaskTypeFilter(e.target.value)}
                      className="px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E2D7CB] text-xs font-bold text-[#2C241D] cursor-pointer"
                    >
                      <option value="All">All Categories</option>
                      <option value="Custom">Custom Production</option>
                      <option value="Fabrication">Wood Fabrication</option>
                    </select>

                    {/* Status Filter */}
                    <select
                      value={taskStatusFilter}
                      onChange={(e) => setTaskStatusFilter(e.target.value)}
                      className="px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E2D7CB] text-xs font-bold text-[#2C241D] cursor-pointer"
                    >
                      <option value="All">All Statuses</option>
                      <option value="ASSIGNED">Assigned</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="ON_HOLD">On Hold</option>
                      <option value="COMPLETED">Completed</option>
                    </select>
                  </div>
                </div>

                {/* Task Cards Grid */}
                {filteredTasks.length === 0 ? (
                  <div className="bg-white/95 rounded-3xl border border-[#E2D7CB] p-12 text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#FAF7F2] border border-[#E2D7CB] flex items-center justify-center mx-auto text-[#7A6C5E]">
                      <Hammer className="w-6 h-6 opacity-40" />
                    </div>
                    <h4 className="text-sm font-extrabold text-[#2C241D]">No Tasks Match Your Filter</h4>
                    <p className="text-xs text-[#7A6C5E]">Try adjusting the status or category filters above.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredTasks.map((task) => (
                      <div
                        key={task.task_id}
                        className="bg-white/95 rounded-3xl border border-[#E2D7CB] p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <span className="text-[10px] font-mono uppercase tracking-widest text-[#B89768] font-black bg-[#EFE8DC] px-2 py-0.5 rounded-md border border-[#D6C9B9]">
                              {task.order_id}
                            </span>
                            <span className={`px-2.5 py-0.5 rounded-full font-black text-[10px] uppercase ${
                              task.task_status === 'COMPLETED' ? 'bg-[#E8F5E9] text-[#2D6338]' :
                              task.task_status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                              task.task_status === 'ON_HOLD' ? 'bg-red-100 text-red-800' :
                              'bg-amber-100 text-amber-800'
                            }`}>
                              {task.task_status}
                            </span>
                          </div>

                          <div>
                            <h4 className="text-sm font-black text-[#2C241D] leading-snug">
                              {task.job_name}
                            </h4>
                            <span className="text-xs font-extrabold text-[#38A132] block mt-0.5">
                              Stage: {task.stage_name}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-[11px] bg-[#FAF7F2] p-2.5 rounded-2xl border border-[#E2D7CB]">
                            <div>
                              <span className="text-[10px] text-[#7A6C5E] uppercase block font-bold">Timber</span>
                              <span className="font-extrabold text-[#2C241D] truncate block">{task.material || 'Standard'}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-[#7A6C5E] uppercase block font-bold">Dimensions</span>
                              <span className="font-extrabold text-[#2C241D] truncate block">{task.dimensions || 'Standard'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="pt-3 border-t border-[#EFE7DE] flex items-center justify-between gap-2">
                          <button
                            onClick={() => {
                              setSelectedTaskForDetail(task);
                              setIsTaskDetailModalOpen(true);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-[#FAF7F2] hover:bg-[#EFE8DC] text-[#2C241D] font-bold text-xs border border-[#E2D7CB] cursor-pointer"
                          >
                            Details
                          </button>

                          {task.task_status === 'ASSIGNED' && (
                            <button
                              onClick={() => handleStartTask(task.task_id)}
                              className="px-3.5 py-1.5 rounded-xl bg-[#38A132] hover:bg-[#2F8829] text-white font-extrabold text-xs shadow-xs cursor-pointer"
                            >
                              Start Stage
                            </button>
                          )}

                          {task.task_status === 'IN_PROGRESS' && (
                            <button
                              onClick={() => handleOpenCompleteModal(task)}
                              className="px-3.5 py-1.5 rounded-xl bg-[#38A132] hover:bg-[#2F8829] text-white font-extrabold text-xs shadow-xs cursor-pointer"
                            >
                              Complete Stage
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ===================================================================== */}
            {/* 5. TAB 3: ON-SITE FIELD SERVICES                                      */}
            {/* ===================================================================== */}
            {activeTab === 'onsite' && (
              <div className="space-y-4 relative z-10 animate-fadeIn">
                {onsiteJobsList.length === 0 ? (
                  <div className="bg-white/95 rounded-3xl border border-[#E2D7CB] p-12 text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#FAF7F2] border border-[#E2D7CB] flex items-center justify-center mx-auto text-[#7A6C5E]">
                      <MapPin className="w-6 h-6 opacity-40" />
                    </div>
                    <h4 className="text-sm font-extrabold text-[#2C241D]">No On-Site Service Appointments</h4>
                    <p className="text-xs text-[#7A6C5E]">Service jobs assigned by production supervisors will appear here.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {onsiteJobsList.map((job) => (
                      <div
                        key={job.job_id}
                        className="bg-white/95 rounded-3xl border border-[#E2D7CB] p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <span className="text-[10px] font-mono uppercase tracking-widest text-[#B89768] font-black bg-[#EFE8DC] px-2 py-0.5 rounded-md border border-[#D6C9B9]">
                              {job.service_id}
                            </span>
                            <span className={`px-2.5 py-0.5 rounded-full font-black text-[10px] uppercase ${
                              job.status === 'COMPLETED' ? 'bg-[#E8F5E9] text-[#2D6338]' :
                              job.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                              job.status === 'IN_TRANSIT' ? 'bg-indigo-100 text-indigo-800' :
                              'bg-amber-100 text-amber-800'
                            }`}>
                              {job.status}
                            </span>
                          </div>

                          <div>
                            <h4 className="text-sm font-black text-[#2C241D]">
                              {job.customer_name} • {job.service_category}
                            </h4>
                            <p className="text-xs text-[#7A6C5E] mt-1">{job.description}</p>
                          </div>

                          <div className="p-3 bg-[#FAF7F2] rounded-2xl border border-[#E2D7CB] space-y-1 text-xs">
                            <div className="flex items-center gap-2 text-[#2C241D] font-extrabold">
                              <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                              <span>{job.address}</span>
                            </div>
                            <div className="flex items-center gap-2 text-[#7A6C5E] font-bold">
                              <Phone className="w-3.5 h-3.5 shrink-0" />
                              <span>{job.customer_phone}</span>
                            </div>
                            <div className="flex items-center gap-2 text-[#7A6C5E] font-bold">
                              <Clock className="w-3.5 h-3.5 shrink-0" />
                              <span>Scheduled: {job.scheduled_time}</span>
                            </div>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-[#EFE7DE] flex items-center justify-between">
                          <button
                            onClick={() => handleOpenOnsiteModal(job)}
                            className="w-full py-2 rounded-xl bg-[#38A132] hover:bg-[#2F8829] text-white font-extrabold text-xs shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <Camera className="w-3.5 h-3.5" />
                            <span>Update Status & Photos</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ===================================================================== */}
            {/* 6. TAB 4: QC REWORK SECTION                                           */}
            {/* ===================================================================== */}
            {activeTab === 'rework' && (
              <div className="space-y-4 relative z-10 animate-fadeIn">
                {reworkList.length === 0 ? (
                  <div className="bg-white/95 rounded-3xl border border-[#E2D7CB] p-12 text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#FAF7F2] border border-[#E2D7CB] flex items-center justify-center mx-auto text-[#7A6C5E]">
                      <CheckCircle2 className="w-6 h-6 text-[#38A132]" />
                    </div>
                    <h4 className="text-sm font-extrabold text-[#2C241D]">Zero QC Defects Assigned</h4>
                    <p className="text-xs text-[#7A6C5E]">All inspected jobs have passed quality benchmarks cleanly.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {reworkList.map((rw) => (
                      <div
                        key={rw.rework_id}
                        className="bg-white/95 rounded-3xl border border-[#E2D7CB] p-5 shadow-xs hover:shadow-md transition-all space-y-4"
                      >
                        <div className="flex items-start justify-between">
                          <span className="text-[10px] font-mono uppercase tracking-widest text-[#B89768] font-black bg-[#EFE8DC] px-2 py-0.5 rounded-md border border-[#D6C9B9]">
                            {rw.order_id}
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full font-black text-[10px] uppercase ${
                            rw.status === 'RESOLVED' ? 'bg-[#E8F5E9] text-[#2D6338]' : 'bg-red-100 text-red-800'
                          }`}>
                            {rw.status}
                          </span>
                        </div>

                        <div>
                          <h4 className="text-sm font-black text-[#2C241D]">{rw.order_title}</h4>
                          <div className="p-2.5 bg-red-50 rounded-xl border border-red-200 mt-2 text-xs text-red-800">
                            <strong className="block font-black text-[10px] uppercase text-red-700">QC Defect Reason:</strong>
                            {rw.rework_reason}
                          </div>
                        </div>

                        {rw.checklist && (
                          <div className="grid grid-cols-2 gap-2 text-[10px] font-bold">
                            <div className={`p-1.5 rounded-lg ${rw.checklist.dimensions ? 'bg-[#E8F5E9] text-[#2D6338]' : 'bg-red-100 text-red-800'}`}>
                              Dimensions: {rw.checklist.dimensions ? 'Passed' : 'Defect'}
                            </div>
                            <div className={`p-1.5 rounded-lg ${rw.checklist.finishing ? 'bg-[#E8F5E9] text-[#2D6338]' : 'bg-red-100 text-red-800'}`}>
                              Finishing: {rw.checklist.finishing ? 'Passed' : 'Defect'}
                            </div>
                          </div>
                        )}

                        <button
                          onClick={() => handleOpenReworkModal(rw)}
                          className="w-full py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs shadow-xs cursor-pointer"
                        >
                          Resolve & Submit for Re-Inspection
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ===================================================================== */}
            {/* 7. TAB 5: DRIVER LOGISTICS (ONLY FOR is_driver)                       */}
            {/* ===================================================================== */}
            {activeTab === 'deliveries' && userProfile?.is_driver && (
              <div className="space-y-4 relative z-10 animate-fadeIn">
                {deliveriesList.length === 0 ? (
                  <div className="bg-white/95 rounded-3xl border border-[#E2D7CB] p-12 text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#FAF7F2] border border-[#E2D7CB] flex items-center justify-center mx-auto text-[#7A6C5E]">
                      <Truck className="w-6 h-6 opacity-40" />
                    </div>
                    <h4 className="text-sm font-extrabold text-[#2C241D]">No Deliveries Assigned</h4>
                    <p className="text-xs text-[#7A6C5E]">Orders dispatched for your delivery vehicle will appear here.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {deliveriesList.map((del) => (
                      <div
                        key={del.fulfillment_id}
                        className="bg-white/95 rounded-3xl border border-[#E2D7CB] p-5 shadow-xs hover:shadow-md transition-all space-y-4"
                      >
                        <div className="flex items-start justify-between">
                          <span className="text-[10px] font-mono uppercase tracking-widest text-[#B89768] font-black bg-[#EFE8DC] px-2 py-0.5 rounded-md border border-[#D6C9B9]">
                            {del.order_id}
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full font-black text-[10px] uppercase ${
                            del.fulfillment_status === 'Delivered' ? 'bg-[#E8F5E9] text-[#2D6338]' : 'bg-indigo-100 text-indigo-800'
                          }`}>
                            {del.delivery_status || del.fulfillment_status}
                          </span>
                        </div>

                        <div>
                          <h4 className="text-sm font-black text-[#2C241D]">{del.customer_name}</h4>
                          <p className="text-xs text-[#7A6C5E] mt-0.5">{del.items_description}</p>
                        </div>

                        <div className="p-3 bg-[#FAF7F2] rounded-2xl border border-[#E2D7CB] space-y-1 text-xs">
                          <div className="flex items-center gap-2 text-[#2C241D] font-extrabold">
                            <MapPin className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                            <span>{del.delivery_address}</span>
                          </div>
                          <div className="flex items-center gap-2 text-[#7A6C5E] font-bold">
                            <Truck className="w-3.5 h-3.5 shrink-0" />
                            <span>Vehicle: {del.vehicle_reg} ({del.vehicle_type})</span>
                          </div>
                          <div className="flex items-center gap-2 text-[#7A6C5E] font-bold">
                            <Phone className="w-3.5 h-3.5 shrink-0" />
                            <span>Phone: {del.customer_phone}</span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleOpenDeliveryModal(del)}
                          className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-xs cursor-pointer"
                        >
                          Update Delivery Status
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ===================================================================== */}
            {/* 8. TAB 6: COMPLETED HISTORY                                           */}
            {/* ===================================================================== */}
            {activeTab === 'completed' && (
              <div className="bg-white/95 rounded-3xl border border-[#E2D7CB] p-5 sm:p-6 shadow-xs space-y-4 relative z-10 animate-fadeIn">
                <div className="flex items-center justify-between pb-3 border-b border-[#EFE7DE]">
                  <h3 className="text-sm sm:text-base font-black text-[#2C241D]">
                    Workshop Finished Operations Log
                  </h3>
                  <span className="text-xs font-extrabold text-[#7A6C5E]">
                    Total Records: {completedHistory.length}
                  </span>
                </div>

                {completedHistory.length === 0 ? (
                  <div className="py-12 text-center text-xs text-[#7A6C5E]">
                    No completed stage history logged yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-[#E2D7CB] text-[#7A6C5E] font-black uppercase text-[10px] tracking-wider bg-[#FAF7F2]">
                          <th className="py-2.5 px-3 rounded-l-xl">Order Ref</th>
                          <th className="py-2.5 px-3">Job Name</th>
                          <th className="py-2.5 px-3">Completed Stage</th>
                          <th className="py-2.5 px-3">Date</th>
                          <th className="py-2.5 px-3">Duration</th>
                          <th className="py-2.5 px-3 text-right rounded-r-xl">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#EFE7DE] font-medium text-[#2C241D]">
                        {completedHistory.map((item, idx) => (
                          <tr key={`${item.task_id}-${idx}`} className="hover:bg-[#FAF7F2] transition-colors">
                            <td className="py-3 px-3 font-mono font-bold text-[#B89768]">{item.order_id}</td>
                            <td className="py-3 px-3 font-extrabold text-[#2C241D]">{item.job_name}</td>
                            <td className="py-3 px-3">
                              <span className="px-2 py-0.5 rounded-md bg-[#FAF7F2] border border-[#E2D7CB] font-bold text-[11px]">
                                {item.stage_name}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-[#7A6C5E]">{item.completed_date}</td>
                            <td className="py-3 px-3 font-bold text-[#38A132]">{item.duration}</td>
                            <td className="py-3 px-3 text-right">
                              <span className="px-2.5 py-0.5 rounded-full bg-[#E8F5E9] text-[#2D6338] font-black text-[10px] uppercase">
                                {item.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ===================================================================== */}
            {/* 9. TAB 7: ADMIN DIRECTIVES & BROADCASTS                               */}
            {/* ===================================================================== */}
            {activeTab === 'admin_messages' && (
              <div className="bg-white/95 rounded-3xl border border-[#E2D7CB] p-5 sm:p-6 shadow-xs space-y-4 relative z-10 animate-fadeIn">
                <div className="flex items-center justify-between pb-3 border-b border-[#EFE7DE]">
                  <h3 className="text-sm sm:text-base font-black text-[#2C241D] flex items-center gap-2">
                    <Mail className="w-4 h-4 text-[#B89768]" />
                    <span>Supervisor & Admin Directives</span>
                  </h3>
                  {unreadAdminMsgsCount > 0 && (
                    <button
                      onClick={() => {
                        if (userProfile?.email) {
                          markAllAdminMessagesReadForUser(userProfile.email, userProfile.role || 'Worker');
                          setAdminDirectives(getMessagesForUser(userProfile.email, userProfile.role || 'Worker'));
                        }
                      }}
                      className="text-xs font-bold text-[#38A132] hover:underline cursor-pointer"
                    >
                      Mark All as Read
                    </button>
                  )}
                </div>

                {adminDirectives.length === 0 ? (
                  <div className="py-12 text-center text-xs text-[#7A6C5E]">
                    No broadcast directives from workshop supervisors.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {adminDirectives.map((msg) => {
                      const isRead = isMessageReadByUser(msg, userProfile?.email || '');
                      return (
                        <div
                          key={msg.id}
                          className={`p-4 rounded-2xl border transition-all ${
                            isRead ? 'bg-[#FAF7F2] border-[#E2D7CB]' : 'bg-amber-50/80 border-amber-300 shadow-xs'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-extrabold text-sm text-[#2C241D]">{msg.subject}</span>
                            <span className="text-[10px] text-[#7A6C5E] font-bold">{msg.createdDate}</span>
                          </div>
                          <p className="text-xs text-[#5C4E42] leading-relaxed">{msg.message}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ===================================================================== */}
            {/* 10. TAB 8: SUPERVISOR INQUIRIES                                       */}
            {/* ===================================================================== */}
            {activeTab === 'queries' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative z-10 animate-fadeIn">
                <div className="bg-white/95 p-5 sm:p-6 rounded-3xl border border-[#E2D7CB] shadow-xs space-y-4">
                  <h3 className="text-sm font-extrabold text-[#2C241D] flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-[#B89768]" />
                    <span>Submit Technical Inquiry to Supervisor</span>
                  </h3>

                  <form onSubmit={handleSubmitQuery} className="space-y-3 text-xs">
                    <div>
                      <label className="block text-[11px] font-bold text-[#7A6C5E] mb-1">Category</label>
                      <select
                        value={queryCategory}
                        onChange={(e: any) => setQueryCategory(e.target.value)}
                        className="w-full p-2.5 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl font-bold text-[#2C241D]"
                      >
                        <option value="General Query">General Operational / Technical Query</option>
                        <option value="Role & Access Permission">Role & Access Permission</option>
                        <option value="Email Change Request">Email / Profile Update Request</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-[#7A6C5E] mb-1">Subject</label>
                      <input
                        type="text"
                        value={querySubject}
                        onChange={(e) => setQuerySubject(e.target.value)}
                        placeholder="Brief subject summary..."
                        className="w-full p-2.5 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl font-bold text-[#2C241D]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-[#7A6C5E] mb-1">Details</label>
                      <textarea
                        rows={4}
                        value={queryMessage}
                        onChange={(e) => setQueryMessage(e.target.value)}
                        placeholder="Describe drawing clarification, technical inquiry, or tool requirement..."
                        className="w-full p-2.5 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl font-medium text-[#2C241D] focus:outline-none focus:border-[#38A132]"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmittingQuery}
                      className="w-full py-2.5 rounded-xl bg-[#38A132] hover:bg-[#2F8829] text-white font-extrabold text-xs shadow-md shadow-[#38A132]/20 cursor-pointer"
                    >
                      {isSubmittingQuery ? 'Submitting...' : 'Send Inquiry to Supervisor'}
                    </button>
                  </form>
                </div>

                <div className="bg-white/95 p-5 sm:p-6 rounded-3xl border border-[#E2D7CB] shadow-xs space-y-3">
                  <h3 className="text-sm font-extrabold text-[#2C241D]">Past Inquiries & Responses</h3>
                  {staffQueries.length === 0 ? (
                    <div className="py-8 text-center text-xs text-[#7A6C5E]">No inquiries submitted yet.</div>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                      {staffQueries.map((q) => (
                        <div key={q.id} className="p-3 bg-[#FAF7F2] rounded-2xl border border-[#E2D7CB] text-xs space-y-1">
                          <div className="flex justify-between items-start">
                            <span className="font-extrabold text-[#2C241D]">{q.subject}</span>
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                              q.status === 'Resolved' ? 'bg-[#E8F5E9] text-[#2D6338]' : 'bg-amber-100 text-amber-900'
                            }`}>
                              {q.status}
                            </span>
                          </div>
                          <p className="text-[#5C4E42]">{q.message}</p>
                          {q.adminResponse && (
                            <div className="mt-1.5 p-2 bg-white rounded-xl border border-[#E2D7CB] text-xs text-[#2D6338]">
                              <strong>Supervisor Response:</strong> {q.adminResponse}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ===================================================================== */}
            {/* 11. TAB 9: LEAVE MANAGEMENT                                           */}
            {/* ===================================================================== */}
            {activeTab === 'leave' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative z-10 animate-fadeIn">
                <div className="bg-white/95 p-5 sm:p-6 rounded-3xl border border-[#E2D7CB] shadow-xs space-y-4">
                  <h3 className="text-sm font-extrabold text-[#2C241D] flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#B89768]" />
                    <span>Apply for Absence / Leave</span>
                  </h3>

                  <form onSubmit={handleSubmitLeave} className="space-y-3 text-xs">
                    <div>
                      <label className="block text-[11px] font-bold text-[#7A6C5E] mb-1">Leave Type</label>
                      <select
                        value={leaveType}
                        onChange={(e) => setLeaveType(e.target.value)}
                        className="w-full p-2.5 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl font-bold text-[#2C241D]"
                      >
                        <option value="Casual Leave">Casual Leave (CL)</option>
                        <option value="Medical Leave">Medical Leave (ML)</option>
                        <option value="Earned Leave">Earned Leave (EL)</option>
                        <option value="Special Duty Off">Special Duty Off</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-[#7A6C5E] mb-1">Start Date</label>
                        <input
                          type="date"
                          value={leaveStartDate}
                          onChange={(e) => setLeaveStartDate(e.target.value)}
                          className="w-full p-2 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl font-bold text-[#2C241D]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-[#7A6C5E] mb-1">End Date</label>
                        <input
                          type="date"
                          value={leaveEndDate}
                          onChange={(e) => setLeaveEndDate(e.target.value)}
                          className="w-full p-2 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl font-bold text-[#2C241D]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-[#7A6C5E] mb-1">Reason</label>
                      <textarea
                        rows={3}
                        value={leaveReason}
                        onChange={(e) => setLeaveReason(e.target.value)}
                        placeholder="Reason for absence..."
                        className="w-full p-2 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl font-medium text-[#2C241D] focus:outline-none focus:border-[#38A132]"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmittingLeave}
                      className="w-full py-2.5 rounded-xl bg-[#38A132] hover:bg-[#2F8829] text-white font-extrabold text-xs shadow-md shadow-[#38A132]/20 cursor-pointer"
                    >
                      {isSubmittingLeave ? 'Submitting Application...' : 'Submit Leave Application'}
                    </button>
                  </form>
                </div>

                <div className="bg-white/95 p-5 sm:p-6 rounded-3xl border border-[#E2D7CB] shadow-xs space-y-3">
                  <h3 className="text-sm font-extrabold text-[#2C241D]">Leave History & Status</h3>
                  {leaveApplications.length === 0 ? (
                    <div className="py-8 text-center text-xs text-[#7A6C5E]">No leave applications submitted.</div>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                      {leaveApplications.map((l) => (
                        <div key={l.leave_id} className="p-3 bg-[#FAF7F2] rounded-2xl border border-[#E2D7CB] text-xs space-y-1">
                          <div className="flex justify-between items-start">
                            <span className="font-extrabold text-[#2C241D]">{l.leave_type} ({l.duration_days} days)</span>
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                              l.status === 'Approved' ? 'bg-[#E8F5E9] text-[#2D6338]' :
                              l.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                              'bg-amber-100 text-amber-900'
                            }`}>
                              {l.status}
                            </span>
                          </div>
                          <p className="text-[#7A6C5E] text-[11px]">{l.start_date} to {l.end_date}</p>
                          <p className="text-[#5C4E42]">{l.reason}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ========================================================================= */}
      {/* 12. INTERACTIVE MODALS & DRAWERS                                          */}
      {/* ========================================================================= */}

      {/* A. TASK DETAILS MODAL */}
      {isTaskDetailModalOpen && selectedTaskForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-2xl bg-white border border-[#E2D7CB] rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto scrollbar-none text-[#2C241D]">
            <div className="flex items-start justify-between border-b border-[#EFE7DE] pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#B89768] font-black bg-[#EFE8DC] px-2.5 py-0.5 rounded-md border border-[#D6C9B9]">
                  {selectedTaskForDetail.order_id}
                </span>
                <h3 className="text-base font-extrabold text-[#2C241D] mt-1.5">
                  {selectedTaskForDetail.job_name} — Stage: {selectedTaskForDetail.stage_name}
                </h3>
              </div>
              <button
                onClick={() => setIsTaskDetailModalOpen(false)}
                className="p-1 rounded-xl hover:bg-[#FAF7F2] text-[#7A6C5E] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedTaskForDetail.reference_image && (
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase text-[#7A6C5E]">Design Reference / Blueprint</span>
                <div className="relative h-48 w-full bg-[#FAF7F2] rounded-2xl overflow-hidden border border-[#E2D7CB] group">
                  <img
                    src={selectedTaskForDetail.reference_image}
                    alt="Blueprint"
                    className="w-full h-full object-contain"
                  />
                  <button
                    onClick={() => {
                      if (selectedTaskForDetail.reference_image) {
                        openImageInNewTab(selectedTaskForDetail.reference_image);
                      }
                    }}
                    className="absolute bottom-2 right-2 px-2.5 py-1 rounded-lg bg-black/70 text-white text-[10px] font-bold flex items-center gap-1 hover:bg-black transition-colors cursor-pointer"
                  >
                    <ExternalLink className="w-3 h-3" /> Full Size
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-[#FAF7F2] p-3 rounded-2xl border border-[#E2D7CB]">
                <span className="text-[10px] font-bold text-[#7A6C5E] uppercase block">Dimensions</span>
                <span className="font-extrabold text-[#2C241D]">{selectedTaskForDetail.dimensions || 'Standard'}</span>
              </div>
              <div className="bg-[#FAF7F2] p-3 rounded-2xl border border-[#E2D7CB]">
                <span className="text-[10px] font-bold text-[#7A6C5E] uppercase block">Material</span>
                <span className="font-extrabold text-[#2C241D]">{selectedTaskForDetail.material || 'Solid Wood'}</span>
              </div>
              <div className="bg-[#FAF7F2] p-3 rounded-2xl border border-[#E2D7CB]">
                <span className="text-[10px] font-bold text-[#7A6C5E] uppercase block">Finish / Color</span>
                <span className="font-extrabold text-[#2C241D]">{selectedTaskForDetail.color || 'Natural'}</span>
              </div>
              <div className="bg-[#FAF7F2] p-3 rounded-2xl border border-[#E2D7CB]">
                <span className="text-[10px] font-bold text-[#7A6C5E] uppercase block">Required Skill</span>
                <span className="font-extrabold text-[#2C241D]">{selectedTaskForDetail.required_skill}</span>
              </div>
            </div>

            {selectedTaskForDetail.technical_instructions && (
              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900">
                <strong className="block font-bold text-[10px] uppercase text-amber-800">Technician Instructions:</strong>
                {selectedTaskForDetail.technical_instructions}
              </div>
            )}

            <div className="pt-3 border-t border-[#EFE7DE] flex justify-end gap-2">
              <button
                onClick={() => setIsTaskDetailModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#FAF7F2] border border-[#E2D7CB] text-xs font-bold hover:bg-[#EFE8DC] cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* B. COMPLETE TASK MODAL */}
      {isCompleteModalOpen && selectedTaskForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-lg bg-white border border-[#E2D7CB] rounded-3xl p-6 shadow-2xl space-y-4 text-[#2C241D]">
            <div className="flex items-center justify-between border-b border-[#EFE7DE] pb-3">
              <h3 className="text-base font-extrabold text-[#2C241D]">
                Complete Stage: {selectedTaskForDetail.stage_name}
              </h3>
              <button onClick={() => setIsCompleteModalOpen(false)} className="p-1 rounded-xl hover:bg-[#FAF7F2] cursor-pointer">
                <X className="w-5 h-5 text-[#7A6C5E]" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-[#7A6C5E] mb-1">Completion Notes / Remarks</label>
                <textarea
                  rows={3}
                  value={completeNotes}
                  onChange={(e) => setCompleteNotes(e.target.value)}
                  placeholder="Notes on joinery, tolerances, sanding finish..."
                  className="w-full p-2 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl font-medium focus:outline-none focus:border-[#38A132]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#7A6C5E] mb-1">Work Finished Photo URL (Optional)</label>
                <input
                  type="text"
                  value={completeWorkImages}
                  onChange={(e) => setCompleteWorkImages(e.target.value)}
                  placeholder="https://..."
                  className="w-full p-2 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl font-medium"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-[#EFE7DE] flex justify-end gap-2">
              <button
                onClick={() => setIsCompleteModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#FAF7F2] border border-[#E2D7CB] text-xs font-bold hover:bg-[#EFE8DC] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmCompleteTask}
                disabled={isSubmittingComplete}
                className="px-4 py-2 rounded-xl bg-[#38A132] hover:bg-[#2F8829] text-white text-xs font-extrabold shadow-md shadow-[#38A132]/20 cursor-pointer"
              >
                {isSubmittingComplete ? 'Completing...' : 'Confirm Stage Completion'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* C. REPORT ISSUE / ON HOLD MODAL */}
      {isReportIssueModalOpen && selectedTaskForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-lg bg-white border border-[#E2D7CB] rounded-3xl p-6 shadow-2xl space-y-4 text-[#2C241D]">
            <div className="flex items-center justify-between border-b border-[#EFE7DE] pb-3">
              <h3 className="text-base font-extrabold text-amber-900">
                Report Issue & Put Stage On Hold
              </h3>
              <button onClick={() => setIsReportIssueModalOpen(false)} className="p-1 rounded-xl hover:bg-[#FAF7F2] cursor-pointer">
                <X className="w-5 h-5 text-[#7A6C5E]" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-[#7A6C5E] mb-1">Issue Category</label>
                <select
                  value={issueType}
                  onChange={(e) => setIssueType(e.target.value)}
                  className="w-full p-2 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl font-bold"
                >
                  <option value="Material Unavailable">Material Unavailable / Shortage</option>
                  <option value="Defect in Timber / Raw Material">Defect in Timber / Raw Material</option>
                  <option value="Machine Breakdown">Machine / Tool Breakdown</option>
                  <option value="Blueprint / Specification Discrepancy">Blueprint / Specification Discrepancy</option>
                  <option value="Hardware Fitting Missing">Hardware Fitting Missing</option>
                  <option value="Other Workshop Impediment">Other Workshop Impediment</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#7A6C5E] mb-1">Description of Issue</label>
                <textarea
                  rows={3}
                  value={issueDescription}
                  onChange={(e) => setIssueDescription(e.target.value)}
                  placeholder="Detail the issue stopping production..."
                  className="w-full p-2 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl font-medium focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-[#EFE7DE] flex justify-end gap-2">
              <button
                onClick={() => setIsReportIssueModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#FAF7F2] border border-[#E2D7CB] text-xs font-bold hover:bg-[#EFE8DC] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReportIssue}
                disabled={isSubmittingIssue || !issueDescription.trim()}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold shadow-md cursor-pointer"
              >
                {isSubmittingIssue ? 'Submitting...' : 'Mark Stage On Hold'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* D. ON-SITE JOB STATUS MODAL */}
      {isOnsiteModalOpen && selectedOnsiteJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-lg bg-white border border-[#E2D7CB] rounded-3xl p-6 shadow-2xl space-y-4 text-[#2C241D]">
            <div className="flex items-center justify-between border-b border-[#EFE7DE] pb-3">
              <h3 className="text-base font-extrabold text-[#2C241D]">
                On-Site Job #{selectedOnsiteJob.job_id} — {selectedOnsiteJob.customer_name}
              </h3>
              <button onClick={() => setIsOnsiteModalOpen(false)} className="p-1 rounded-xl hover:bg-[#FAF7F2] cursor-pointer">
                <X className="w-5 h-5 text-[#7A6C5E]" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-[#7A6C5E] mb-1">Customer & Service Notes</label>
                <textarea
                  rows={2}
                  value={onsiteNotes}
                  onChange={(e) => setOnsiteNotes(e.target.value)}
                  placeholder="Notes from customer premises..."
                  className="w-full p-2 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#7A6C5E] mb-1">Before Service Photo URL</label>
                <input
                  type="text"
                  value={onsiteBeforePhoto}
                  onChange={(e) => setOnsiteBeforePhoto(e.target.value)}
                  placeholder="https://..."
                  className="w-full p-2 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#7A6C5E] mb-1">After Service Photo URL</label>
                <input
                  type="text"
                  value={onsiteAfterPhoto}
                  onChange={(e) => setOnsiteAfterPhoto(e.target.value)}
                  placeholder="https://..."
                  className="w-full p-2 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-[#EFE7DE] flex flex-wrap justify-end gap-2">
              <button
                onClick={() => handleUpdateOnsiteStatus('IN_TRANSIT')}
                disabled={isSubmittingOnsite}
                className="px-3 py-2 rounded-xl bg-indigo-50 text-indigo-800 border border-indigo-200 font-bold text-xs cursor-pointer"
              >
                In Transit
              </button>
              <button
                onClick={() => handleUpdateOnsiteStatus('IN_PROGRESS')}
                disabled={isSubmittingOnsite}
                className="px-3 py-2 rounded-xl bg-blue-50 text-blue-800 border border-blue-200 font-bold text-xs cursor-pointer"
              >
                In Progress
              </button>
              <button
                onClick={() => handleUpdateOnsiteStatus('COMPLETED')}
                disabled={isSubmittingOnsite}
                className="px-4 py-2 rounded-xl bg-[#38A132] hover:bg-[#2F8829] text-white font-extrabold text-xs shadow-md shadow-[#38A132]/20 cursor-pointer"
              >
                Mark Completed
              </button>
            </div>
          </div>
        </div>
      )}

      {/* E. REWORK RESOLUTION MODAL */}
      {isReworkModalOpen && selectedReworkForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-lg bg-white border border-[#E2D7CB] rounded-3xl p-6 shadow-2xl space-y-4 text-[#2C241D]">
            <div className="flex items-center justify-between border-b border-[#EFE7DE] pb-3">
              <h3 className="text-base font-extrabold text-purple-900">
                Resolve Rework #{selectedReworkForDetail.rework_id}
              </h3>
              <button onClick={() => setIsReworkModalOpen(false)} className="p-1 rounded-xl hover:bg-[#FAF7F2] cursor-pointer">
                <X className="w-5 h-5 text-[#7A6C5E]" />
              </button>
            </div>

            <div className="p-3 bg-red-50 rounded-2xl border border-red-200 text-xs text-red-900">
              <strong>Defect:</strong> {selectedReworkForDetail.rework_reason}
            </div>

            <div className="space-y-3 text-xs">
              <label className="block text-[11px] font-bold text-[#7A6C5E]">Resolution / Rectification Notes</label>
              <textarea
                rows={3}
                value={reworkResolveNotes}
                onChange={(e) => setReworkResolveNotes(e.target.value)}
                placeholder="Describe rectifications performed (re-planed surface, replaced veneer...)"
                className="w-full p-2 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl font-medium focus:outline-none focus:border-purple-600"
              />
            </div>

            <div className="pt-3 border-t border-[#EFE7DE] flex justify-end gap-2">
              <button
                onClick={() => setIsReworkModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#FAF7F2] border border-[#E2D7CB] text-xs font-bold hover:bg-[#EFE8DC] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmResolveRework}
                disabled={isSubmittingRework}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-extrabold shadow-md cursor-pointer"
              >
                {isSubmittingRework ? 'Submitting...' : 'Mark Resolved & Request QC'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* F. DRIVER DELIVERY MODAL */}
      {isDeliveryModalOpen && selectedDelivery && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-lg bg-white border border-[#E2D7CB] rounded-3xl p-6 shadow-2xl space-y-4 text-[#2C241D]">
            <div className="flex items-center justify-between border-b border-[#EFE7DE] pb-3">
              <h3 className="text-base font-extrabold text-indigo-900">
                Delivery Status: {selectedDelivery.order_id}
              </h3>
              <button onClick={() => setIsDeliveryModalOpen(false)} className="p-1 rounded-xl hover:bg-[#FAF7F2] cursor-pointer">
                <X className="w-5 h-5 text-[#7A6C5E]" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-[#7A6C5E] mb-1">Status</label>
                <select
                  value={deliveryStatusInput}
                  onChange={(e) => setDeliveryStatusInput(e.target.value)}
                  className="w-full p-2 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl font-bold"
                >
                  <option value="Dispatched">Dispatched from Hub</option>
                  <option value="Out for Delivery">Out for Delivery</option>
                  <option value="Delivered">Delivered & Handed Over</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#7A6C5E] mb-1">Delivery Handover Notes</label>
                <textarea
                  rows={2}
                  value={deliveryNotesInput}
                  onChange={(e) => setDeliveryNotesInput(e.target.value)}
                  placeholder="Customer signature received, placed in living room..."
                  className="w-full p-2 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl font-medium"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-[#EFE7DE] flex justify-end gap-2">
              <button
                onClick={() => setIsDeliveryModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#FAF7F2] border border-[#E2D7CB] text-xs font-bold hover:bg-[#EFE8DC] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmUpdateDelivery}
                disabled={isSubmittingDelivery}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold shadow-md cursor-pointer"
              >
                {isSubmittingDelivery ? 'Updating...' : 'Save Delivery Status'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* G. SECURITY / PASSWORD CHANGE MODAL */}
      {(isProfileModalOpen || mustChangePasswordModal) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-md bg-white border border-[#E2D7CB] rounded-3xl p-6 shadow-2xl space-y-4 text-[#2C241D]">
            <div className="flex items-center justify-between border-b border-[#EFE7DE] pb-3">
              <h3 className="text-base font-extrabold text-[#2C241D] flex items-center gap-2">
                <Key className="w-5 h-5 text-[#38A132]" />
                <span>{mustChangePasswordModal ? 'Mandatory First-Time Password Change' : 'Security & Password Update'}</span>
              </h3>
              {!mustChangePasswordModal && (
                <button onClick={() => setIsProfileModalOpen(false)} className="p-1 rounded-xl hover:bg-[#FAF7F2] cursor-pointer">
                  <X className="w-5 h-5 text-[#7A6C5E]" />
                </button>
              )}
            </div>

            {passwordNotice && (
              <div className={`p-3 rounded-xl text-xs font-bold ${
                passwordNotice.type === 'success' ? 'bg-[#E8F5E9] text-[#2D6338]' : 'bg-red-100 text-red-800'
              }`}>
                {passwordNotice.text}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-[#7A6C5E] mb-1">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  className="w-full p-2.5 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#7A6C5E] mb-1">New Password (Min 6 chars)</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="w-full p-2.5 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#7A6C5E] mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full p-2.5 bg-[#FAF7F2] border border-[#E2D7CB] rounded-xl font-bold"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                {!mustChangePasswordModal && (
                  <button
                    type="button"
                    onClick={() => setIsProfileModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-[#FAF7F2] border border-[#E2D7CB] text-xs font-bold hover:bg-[#EFE8DC] cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#38A132] hover:bg-[#2F8829] text-white text-xs font-extrabold shadow-md shadow-[#38A132]/20 cursor-pointer"
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
