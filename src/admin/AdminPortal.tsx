import React, { useState, useEffect } from 'react';
import {
  AdminAnalytics,
  Task,
  Withdrawal,
  User,
  TaskCategory,
  VerificationType,
  TaskSubmission,
  SystemSettings,
  BroadcastNotification
} from '../types';
import { useTranslation } from '../i18n/useTranslation';
import {
  Shield,
  Lock,
  Users,
  CheckSquare,
  Wallet,
  AlertCircle,
  Plus,
  Trash2,
  Ban,
  RefreshCw,
  Bot,
  ArrowLeft,
  Clock,
  AlertTriangle,
  X,
  LayoutDashboard,
  FileCheck,
  Send,
  Settings,
  Download,
  Search,
  CheckCircle2,
  XCircle,
  LogOut,
  Sparkles,
  TrendingUp,
  DollarSign,
  UserCheck,
  Bell,
  Activity,
  Layers,
  ExternalLink,
  ChevronRight
} from 'lucide-react';

export const AdminPortal: React.FC = () => {
  const { formatCurrency, formatDate } = useTranslation();

  // Authentication State
  const [adminToken, setAdminToken] = useState<string | null>(
    typeof localStorage !== 'undefined' ? localStorage.getItem('novatask_admin_jwt') : null
  );
  const [password, setPassword] = useState<string>('admin123');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  // Active Admin View Tab
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'users' | 'tasks' | 'proofs' | 'withdrawals' | 'analytics' | 'notifications' | 'settings'
  >('dashboard');

  // Admin Data State
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [submissions, setSubmissions] = useState<TaskSubmission[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [broadcasts, setBroadcasts] = useState<BroadcastNotification[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Search & Filter States
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userFilterStatus, setUserFilterStatus] = useState<'all' | 'active' | 'blocked' | 'flagged'>('all');
  const [taskSearchQuery, setTaskSearchQuery] = useState('');
  const [withdrawalFilterStatus, setWithdrawalFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  // Modals
  const [showCreateTaskModal, setShowCreateTaskModal] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editBalanceVal, setEditBalanceVal] = useState<string>('');

  // New Task Form
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState<TaskCategory>('social');
  const [newTaskRewardBirr, setNewTaskRewardBirr] = useState('150');
  const [newTaskRewardPoints, setNewTaskRewardPoints] = useState('1500');
  const [newTaskVerification, setNewTaskVerification] = useState<VerificationType>('admin_check');
  const [newTaskTargetUrl, setNewTaskTargetUrl] = useState('');
  const [newTaskPlatform, setNewTaskPlatform] = useState<string>('telegram');

  // Broadcast Form
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastAudience, setBroadcastAudience] = useState<'all' | 'active' | 'blocked'>('all');
  const [isSendingBroadcast, setIsSendingBroadcast] = useState(false);

  // Settings Form
  const [settingMinWithdrawal, setSettingMinWithdrawal] = useState('2000');
  const [settingMaintenance, setSettingMaintenance] = useState(false);
  const [settingNotice, setSettingNotice] = useState('');

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  useEffect(() => {
    if (adminToken) {
      fetchAdminData();
    }
  }, [adminToken]);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoggingIn(true);
      setLoginError(null);

      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');

      setAdminToken(data.token);
      localStorage.setItem('novatask_admin_jwt', data.token);
      showToast('Admin Session Authenticated successfully', 'success');
    } catch (err: any) {
      setLoginError(err.message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    setAdminToken(null);
    localStorage.removeItem('novatask_admin_jwt');
    showToast('Logged out of Admin Portal', 'info');
  };

  const fetchAdminData = async () => {
    if (!adminToken) return;
    setIsLoading(true);
    try {
      const headers = { Authorization: `Bearer ${adminToken}` };

      const [statsRes, tasksRes, subRes, wthRes, usersRes, settingsRes, bcRes] = await Promise.all([
        fetch('/api/admin/stats', { headers }),
        fetch('/api/tasks', { headers: { 'x-telegram-init-data': 'user={"id":987654321}' } }),
        fetch('/api/admin/submissions', { headers }),
        fetch('/api/admin/withdrawals', { headers }),
        fetch('/api/admin/users', { headers }),
        fetch('/api/admin/settings', { headers }),
        fetch('/api/admin/broadcasts', { headers })
      ]);

      if (statsRes.status === 401 || usersRes.status === 401) {
        handleLogout();
        showToast('Admin session expired. Please log in again.', 'error');
        return;
      }

      const statsData = await statsRes.json();
      const tasksData = await tasksRes.json();
      const subData = await subRes.json();
      const wthData = await wthRes.json();
      const usersData = await usersRes.json();
      const settingsData = await settingsRes.json();
      const bcData = await bcRes.json();

      if (statsData.analytics) setAnalytics(statsData.analytics);
      if (tasksData.tasks) setTasks(tasksData.tasks);
      if (subData.submissions) setSubmissions(subData.submissions);
      if (wthData.withdrawals) setWithdrawals(wthData.withdrawals);
      if (usersData.users) setUsers(usersData.users);
      if (settingsData.settings) {
        setSettings(settingsData.settings);
        setSettingMinWithdrawal(settingsData.settings.minWithdrawalBirr.toString());
        setSettingMaintenance(settingsData.settings.maintenanceMode);
        setSettingNotice(settingsData.settings.systemNotice);
      }
      if (bcData.broadcasts) setBroadcasts(bcData.broadcasts);
    } catch (err) {
      console.error('Error loading admin dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProcessSubmission = async (submissionId: string, status: 'approved' | 'rejected') => {
    if (!adminToken) return;
    const note = prompt(`Optional admin note for this ${status} submission:`, `Verified by Admin`);

    try {
      const res = await fetch(`/api/admin/submissions/${submissionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({ status, adminNote: note || undefined })
      });

      if (!res.ok) throw new Error('Failed to process task submission');
      showToast(`Submission ${status.toUpperCase()} successfully`, 'success');
      fetchAdminData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminToken) return;

    try {
      const res = await fetch('/api/admin/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          title: newTaskTitle,
          description: newTaskDesc,
          category: newTaskCategory,
          platform: newTaskPlatform,
          rewardBirr: Number(newTaskRewardBirr),
          rewardPoints: Number(newTaskRewardPoints),
          verificationType: newTaskVerification,
          targetUrl: newTaskTargetUrl || undefined,
          status: 'active'
        })
      });

      if (!res.ok) throw new Error('Task creation failed');
      showToast('New Task Created Successfully', 'success');
      setShowCreateTaskModal(false);
      setNewTaskTitle('');
      setNewTaskDesc('');
      fetchAdminData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!adminToken || !confirm('Are you sure you want to delete this task?')) return;

    try {
      const res = await fetch(`/api/admin/tasks/${taskId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      if (res.ok) {
        showToast('Task deleted from system', 'info');
        fetchAdminData();
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleProcessWithdrawal = async (withdrawalId: string, status: 'approved' | 'rejected') => {
    if (!adminToken) return;
    const note = prompt(`Admin note for this ${status} request (optional):`, `Processed by Admin`);

    try {
      const res = await fetch(`/api/admin/withdrawals/${withdrawalId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({ status, adminNote: note || undefined })
      });

      if (!res.ok) throw new Error('Failed to update withdrawal status');
      showToast(`Withdrawal ${status.toUpperCase()} successfully`, 'success');
      fetchAdminData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleToggleBlockUser = async (userId: string, currentIsBlocked: boolean) => {
    if (!adminToken) return;
    try {
      const res = await fetch(`/api/admin/users/${userId}/block`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({ isBlocked: !currentIsBlocked })
      });
      if (res.ok) {
        showToast(`User Account ${!currentIsBlocked ? 'Blocked' : 'Unblocked'}`, 'info');
        fetchAdminData();
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleSaveUserBalance = async () => {
    if (!adminToken || !editingUser) return;
    try {
      const res = await fetch(`/api/admin/users/${editingUser.id}/balance`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({ balance: Number(editBalanceVal) })
      });
      if (res.ok) {
        showToast(`User balance updated to ${editBalanceVal} Birr`, 'success');
        setEditingUser(null);
        fetchAdminData();
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminToken || !broadcastTitle || !broadcastMessage) return;

    try {
      setIsSendingBroadcast(true);
      const res = await fetch('/api/admin/broadcasts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          title: broadcastTitle,
          message: broadcastMessage,
          targetAudience: broadcastAudience
        })
      });

      if (!res.ok) throw new Error('Failed to send broadcast notification');
      showToast('Broadcast notification sent successfully', 'success');
      setBroadcastTitle('');
      setBroadcastMessage('');
      fetchAdminData();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSendingBroadcast(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminToken) return;

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          minWithdrawalBirr: Number(settingMinWithdrawal),
          maintenanceMode: settingMaintenance,
          systemNotice: settingNotice
        })
      });

      if (!res.ok) throw new Error('Failed to save system settings');
      showToast('System settings updated successfully', 'success');
      fetchAdminData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleExportCSV = () => {
    if (!users || users.length === 0) return;
    const headers = ['ID', 'Telegram ID', 'FirstName', 'Username', 'Balance (Birr)', 'Referrals', 'Risk Score', 'Blocked', 'Joined Date'];
    const rows = users.map(u => [
      u.id,
      u.telegramId,
      `"${u.firstName || ''}"`,
      `"${u.username || ''}"`,
      u.balance,
      u.referralsCount,
      u.riskScore || 0,
      u.isBlocked ? 'YES' : 'NO',
      u.createdAt
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `novatask_users_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Exported users summary CSV', 'success');
  };

  // UNAUTHENTICATED: Admin Login Portal Screen
  if (!adminToken) {
    return (
      <div className="min-h-screen bg-[#050508] text-slate-200 font-sans flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-80 h-80 bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="w-full max-w-md bg-[#0d0d14] border border-white/10 rounded-3xl p-8 space-y-6 shadow-2xl relative z-10">
          <div className="text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center mx-auto shadow-inner">
              <Shield className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">NovaTask Admin Portal</h1>
              <p className="text-xs text-slate-400 mt-1">Standalone Secure Platform Console</p>
            </div>
          </div>

          {loginError && (
            <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Admin Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#050508] border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-all"
                  placeholder="admin123"
                  required
                />
              </div>
              <p className="text-[11px] text-slate-500 flex items-center justify-between mt-1">
                <span>Default Password: <code className="text-indigo-400 font-mono">admin123</code></span>
                <span className="text-emerald-400 font-mono">Protected API</span>
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:brightness-110 font-bold text-white text-xs tracking-wide shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2"
            >
              {isLoggingIn ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>Authenticating Session...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 text-indigo-200" />
                  <span>Authenticate Admin Access</span>
                </>
              )}
            </button>
          </form>

          <div className="pt-4 border-t border-white/10 text-center">
            <a
              href="/"
              className="text-xs text-slate-400 hover:text-white inline-flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Telegram Mini App</span>
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Count metrics
  const pendingSubmissionsCount = submissions.filter(s => s.status === 'pending').length;
  const pendingWithdrawalsCount = withdrawals.filter(w => w.status === 'pending').length;

  // Filtered Users
  const filteredUsers = users.filter(u => {
    const query = userSearchQuery.toLowerCase();
    const matchesQuery =
      u.firstName.toLowerCase().includes(query) ||
      (u.username && u.username.toLowerCase().includes(query)) ||
      u.telegramId.toString().includes(query) ||
      (u.lastIp && u.lastIp.includes(query));

    if (!matchesQuery) return false;
    if (userFilterStatus === 'active') return !u.isBlocked;
    if (userFilterStatus === 'blocked') return u.isBlocked;
    if (userFilterStatus === 'flagged') return Boolean((u.riskScore && u.riskScore > 30) || (u.fraudFlags && u.fraudFlags.length > 0));
    return true;
  });

  // Filtered Tasks
  const filteredTasks = tasks.filter(t =>
    t.title.toLowerCase().includes(taskSearchQuery.toLowerCase()) ||
    t.category.toLowerCase().includes(taskSearchQuery.toLowerCase()) ||
    (t.platform && t.platform.toLowerCase().includes(taskSearchQuery.toLowerCase()))
  );

  // Filtered Withdrawals
  const filteredWithdrawals = withdrawals.filter(w => {
    if (withdrawalFilterStatus === 'all') return true;
    return w.status === withdrawalFilterStatus;
  });

  return (
    <div className="min-h-screen bg-[#050508] text-slate-200 font-sans flex flex-col md:flex-row">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl bg-[#0f0f18] border border-white/20 text-xs shadow-2xl animate-fade-in">
          {toastMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          {toastMessage.type === 'error' && <XCircle className="w-4 h-4 text-rose-400" />}
          {toastMessage.type === 'info' && <Sparkles className="w-4 h-4 text-indigo-400" />}
          <span className="text-white font-medium">{toastMessage.text}</span>
        </div>
      )}

      {/* ADMIN SIDEBAR NAVIGATION */}
      <aside className="w-full md:w-64 bg-[#0a0a0f] border-b md:border-b-0 md:border-r border-white/10 flex-shrink-0 flex flex-col justify-between p-4 z-30">
        <div className="space-y-6">
          {/* Brand Header */}
          <div className="flex items-center gap-3 px-2 py-1">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 p-0.5 shadow-lg shadow-indigo-500/20">
              <div className="w-full h-full bg-[#050508] rounded-[14px] flex items-center justify-center">
                <Shield className="w-5 h-5 text-indigo-400" />
              </div>
            </div>
            <div>
              <h2 className="text-sm font-black text-white tracking-wide">NovaTask Admin</h2>
              <p className="text-[10px] text-purple-400 font-semibold uppercase tracking-wider">Portal Console</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {[
              { id: 'dashboard', label: 'Dashboard Overview', icon: LayoutDashboard },
              { id: 'users', label: 'User Management', icon: Users, badge: analytics?.flaggedUsersCount ? `${analytics.flaggedUsersCount} Alert` : undefined, badgeColor: 'bg-rose-500/20 text-rose-300' },
              { id: 'tasks', label: 'Task Management', icon: CheckSquare },
              { id: 'proofs', label: 'Proof Review', icon: FileCheck, badge: pendingSubmissionsCount > 0 ? pendingSubmissionsCount : undefined, badgeColor: 'bg-amber-500 text-slate-950 font-bold' },
              { id: 'withdrawals', label: 'Withdrawal Approval', icon: Wallet, badge: pendingWithdrawalsCount > 0 ? pendingWithdrawalsCount : undefined, badgeColor: 'bg-purple-500 text-white font-bold' },
              { id: 'analytics', label: 'Analytics & Reports', icon: Activity },
              { id: 'notifications', label: 'Notifications', icon: Bell },
              { id: 'settings', label: 'System Settings', icon: Settings }
            ].map((item) => {
              const Icon = item.icon;
              const isSelected = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as any)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
                    isSelected
                      ? 'bg-gradient-to-r from-indigo-600/30 to-purple-600/30 text-white border border-indigo-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-indigo-400' : 'text-slate-500'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] ${item.badgeColor || 'bg-indigo-500/20 text-indigo-300'}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer Admin Status & Logout */}
        <div className="pt-4 border-t border-white/10 space-y-3">
          <div className="flex items-center gap-2.5 px-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <div className="text-[11px]">
              <p className="text-white font-medium">Administrator Session</p>
              <p className="text-slate-500 text-[10px]">Active Token Auth</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/50 border border-rose-500/30 text-rose-300 text-xs font-semibold transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* MAIN ADMIN CONTENT AREA */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
        {/* TOP MAIN HEADER BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <h1 className="text-2xl font-black text-white capitalize">{activeTab.replace('_', ' ')} Portal</h1>
            <p className="text-xs text-slate-400 mt-0.5">NovaTask System Operations & Administrative Control</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchAdminData}
              className="p-2.5 rounded-2xl bg-[#0f0f15] hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-colors flex items-center gap-2 text-xs font-medium"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
              <span className="hidden sm:inline">Refresh Data</span>
            </button>

            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2.5 rounded-2xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold flex items-center gap-2 transition-all"
            >
              <span>Mini App Live View</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* SECTION 1: DASHBOARD OVERVIEW */}
        {activeTab === 'dashboard' && analytics && (
          <div className="space-y-6">
            {/* Analytics Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-5 rounded-3xl bg-[#0f0f15] border border-white/10 space-y-2 relative overflow-hidden">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-xs font-semibold uppercase tracking-wider">Total Users</span>
                  <Users className="w-4 h-4 text-indigo-400" />
                </div>
                <p className="text-3xl font-black text-white">{analytics.totalUsers}</p>
                <p className="text-[10px] text-emerald-400 font-medium">+{analytics.activeUsers24h} Active (24h)</p>
              </div>

              <div className="p-5 rounded-3xl bg-[#0f0f15] border border-white/10 space-y-2">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-xs font-semibold uppercase tracking-wider">Completed Tasks</span>
                  <CheckSquare className="w-4 h-4 text-emerald-400" />
                </div>
                <p className="text-3xl font-black text-emerald-400">{analytics.completedTasksCount}</p>
                <p className="text-[10px] text-slate-400">Task Actions Executed</p>
              </div>

              <div className="p-5 rounded-3xl bg-[#0f0f15] border border-white/10 space-y-2">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-xs font-semibold uppercase tracking-wider">Rewards Distributed</span>
                  <DollarSign className="w-4 h-4 text-amber-400" />
                </div>
                <p className="text-2xl font-black text-amber-400">{formatCurrency(analytics.totalRewardsDistributedBirr)}</p>
                <p className="text-[10px] text-slate-400">Total Paid Out to Users</p>
              </div>

              <div className="p-5 rounded-3xl bg-[#0f0f15] border border-white/10 space-y-2">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-xs font-semibold uppercase tracking-wider">Pending Cashouts</span>
                  <Wallet className="w-4 h-4 text-purple-400" />
                </div>
                <p className="text-2xl font-black text-purple-400">{formatCurrency(analytics.totalPendingWithdrawalsBirr)}</p>
                <p className="text-[10px] text-purple-300">{pendingWithdrawalsCount} Requests Awaiting Review</p>
              </div>
            </div>

            {/* Action Queues Summary Grid */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Proof Review Queue Preview */}
              <div className="p-6 rounded-3xl bg-[#0f0f15] border border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                    <FileCheck className="w-5 h-5 text-indigo-400" />
                    <span>Social Proofs Pending Review</span>
                  </h3>
                  <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold">
                    {pendingSubmissionsCount} Pending
                  </span>
                </div>

                <div className="space-y-2.5">
                  {submissions.filter(s => s.status === 'pending').slice(0, 4).map((sub) => (
                    <div key={sub.id} className="p-3.5 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between text-xs">
                      <div className="space-y-0.5">
                        <p className="font-bold text-white">{sub.taskTitle}</p>
                        <p className="text-slate-400 text-[11px]">User @{sub.username} | Proof: <code className="text-indigo-300">{sub.proofData}</code></p>
                      </div>
                      <button
                        onClick={() => setActiveTab('proofs')}
                        className="px-3 py-1.5 rounded-xl bg-indigo-500/20 text-indigo-300 font-semibold hover:bg-indigo-500/30 text-[11px]"
                      >
                        Review
                      </button>
                    </div>
                  ))}

                  {pendingSubmissionsCount === 0 && (
                    <div className="p-6 text-center text-slate-500 text-xs">All social proof submissions reviewed!</div>
                  )}
                </div>
              </div>

              {/* Cashouts Queue Preview */}
              <div className="p-6 rounded-3xl bg-[#0f0f15] border border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-purple-400" />
                    <span>Pending Cashout Requests</span>
                  </h3>
                  <span className="px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-bold">
                    {pendingWithdrawalsCount} Pending
                  </span>
                </div>

                <div className="space-y-2.5">
                  {withdrawals.filter(w => w.status === 'pending').slice(0, 4).map((wth) => (
                    <div key={wth.id} className="p-3.5 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-white">{wth.accountName} ({wth.method.toUpperCase()})</p>
                        <p className="text-slate-400 text-[11px]">Acc: {wth.accountNumber}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-black text-amber-400">{formatCurrency(wth.amount)}</span>
                        <button
                          onClick={() => setActiveTab('withdrawals')}
                          className="px-3 py-1.5 rounded-xl bg-purple-500/20 text-purple-300 font-semibold hover:bg-purple-500/30 text-[11px]"
                        >
                          Approve
                        </button>
                      </div>
                    </div>
                  ))}

                  {pendingWithdrawalsCount === 0 && (
                    <div className="p-6 text-center text-slate-500 text-xs">No pending cashouts in queue.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 2: USER MANAGEMENT */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            {/* Search & Filter Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-3xl bg-[#0f0f15] border border-white/10">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  placeholder="Search user name, username, ID, or IP..."
                  className="w-full bg-[#050508] border border-white/10 rounded-2xl pl-10 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                {(['all', 'active', 'blocked', 'flagged'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setUserFilterStatus(st)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all ${
                      userFilterStatus === st
                        ? 'bg-indigo-500/20 border border-indigo-500/50 text-indigo-300'
                        : 'bg-white/5 border border-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    {st}
                  </button>
                ))}

                <button
                  onClick={handleExportCSV}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 hover:bg-emerald-500/30 transition-all ml-auto"
                >
                  <Download className="w-3.5 h-3.5" /> Export CSV
                </button>
              </div>
            </div>

            {/* Users List */}
            <div className="space-y-3">
              {filteredUsers.map((u) => (
                <div key={u.id} className="p-5 rounded-3xl bg-[#0f0f15] border border-white/10 space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={u.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                        className="w-12 h-12 rounded-2xl object-cover ring-2 ring-purple-500/30"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white">{u.firstName} {u.lastName || ''}</h4>
                          {u.isBlocked ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase">
                              Suspended
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 font-mono">@{u.username || `user_${u.telegramId}`} | ID: {u.telegramId}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingUser(u);
                          setEditBalanceVal(u.balance.toString());
                        }}
                        className="px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-extrabold transition-all"
                      >
                        {formatCurrency(u.balance)}
                      </button>

                      <button
                        onClick={() => handleToggleBlockUser(u.id, u.isBlocked)}
                        className={`p-2 rounded-xl text-xs font-bold transition-all ${
                          u.isBlocked
                            ? 'bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/30'
                            : 'bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-500/30'
                        }`}
                        title={u.isBlocked ? 'Unblock User' : 'Suspend Account'}
                      >
                        <Ban className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-white/5 text-xs text-slate-400">
                    <div>
                      <span className="text-[10px] block uppercase text-slate-500 font-semibold">Referrals</span>
                      <span className="font-bold text-white">{u.referralsCount} Friends</span>
                    </div>
                    <div>
                      <span className="text-[10px] block uppercase text-slate-500 font-semibold">Anti-Fraud Score</span>
                      <span className={`font-bold ${u.riskScore && u.riskScore > 40 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {u.riskScore || 0}% Risk
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] block uppercase text-slate-500 font-semibold">Joined Date</span>
                      <span className="text-slate-300">{formatDate(u.createdAt)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] block uppercase text-slate-500 font-semibold">Last IP</span>
                      <span className="font-mono text-indigo-300">{u.lastIp || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              ))}

              {filteredUsers.length === 0 && (
                <div className="p-8 rounded-3xl bg-[#0f0f15] border border-white/5 text-center text-slate-500 text-xs">
                  No users matched the search query.
                </div>
              )}
            </div>
          </div>
        )}

        {/* SECTION 3: TASK MANAGEMENT */}
        {activeTab === 'tasks' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-3xl bg-[#0f0f15] border border-white/10">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={taskSearchQuery}
                  onChange={(e) => setTaskSearchQuery(e.target.value)}
                  placeholder="Filter tasks by title or category..."
                  className="w-full bg-[#050508] border border-white/10 rounded-2xl pl-10 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button
                onClick={() => setShowCreateTaskModal(true)}
                className="w-full sm:w-auto py-2.5 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:brightness-110 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
              >
                <Plus className="w-4 h-4" /> Create New Task
              </button>
            </div>

            <div className="space-y-3">
              {filteredTasks.map((task) => (
                <div key={task.id} className="p-5 rounded-3xl bg-[#0f0f15] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        {task.platform || task.category}
                      </span>
                      <span className="text-xs text-slate-500 font-mono">ID: {task.id}</span>
                    </div>
                    <h4 className="text-base font-bold text-white">{task.title}</h4>
                    <p className="text-xs text-slate-400">{task.description}</p>
                    <div className="flex items-center gap-3 text-xs pt-1">
                      <span className="font-bold text-amber-400">{formatCurrency(task.rewardBirr)}</span>
                      <span className="text-slate-500">•</span>
                      <span className="text-indigo-300 font-semibold">{task.rewardPoints} PTS</span>
                      <span className="text-slate-500">•</span>
                      <span className="text-slate-400 uppercase text-[10px] bg-white/5 px-2 py-0.5 rounded">Engine: {task.verificationType}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="p-2.5 rounded-xl bg-rose-950/60 hover:bg-rose-900 border border-rose-500/30 text-rose-300 transition-colors"
                      title="Delete Task"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SECTION 4: PROOF REVIEW */}
        {activeTab === 'proofs' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-white">Social Task Proof Submissions ({submissions.length})</h3>
              <span className="text-xs text-amber-400 font-bold">{pendingSubmissionsCount} Pending Review</span>
            </div>

            <div className="space-y-3">
              {submissions.map((sub) => (
                <div key={sub.id} className="p-5 rounded-3xl bg-[#0f0f15] border border-white/10 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          {sub.platform || sub.category}
                        </span>
                        <span className="text-xs text-indigo-400 font-semibold">User @{sub.username || sub.telegramId}</span>
                      </div>
                      <h4 className="text-base font-bold text-white">{sub.taskTitle}</h4>
                    </div>
                    <div className="text-right">
                      <span className="text-base font-black text-amber-400 block">+{formatCurrency(sub.rewardBirr)}</span>
                      <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-md ${
                        sub.status === 'pending' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : sub.status === 'approved' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}>
                        {sub.status}
                      </span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[#050508] border border-white/10 text-xs space-y-1">
                    <span className="text-slate-500 text-[10px] font-bold uppercase">User Submitted Proof Detail:</span>
                    <p className="text-white font-mono break-all">{sub.proofData}</p>
                  </div>

                  {sub.status === 'pending' && (
                    <div className="flex items-center gap-3 pt-2">
                      <button
                        onClick={() => handleProcessSubmission(sub.id, 'approved')}
                        className="flex-1 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20"
                      >
                        Approve & Credit Reward
                      </button>
                      <button
                        onClick={() => handleProcessSubmission(sub.id, 'rejected')}
                        className="flex-1 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs"
                      >
                        Reject Proof
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {submissions.length === 0 && (
                <div className="p-12 text-center text-slate-500 text-xs bg-[#0f0f15] rounded-3xl border border-white/5">
                  No proof submissions in queue.
                </div>
              )}
            </div>
          </div>
        )}

        {/* SECTION 5: WITHDRAWAL APPROVAL */}
        {activeTab === 'withdrawals' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-white">Cashout & Withdrawal Requests ({withdrawals.length})</h3>
              <div className="flex items-center gap-1.5">
                {(['all', 'pending', 'approved', 'rejected'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setWithdrawalFilterStatus(st)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize ${
                      withdrawalFilterStatus === st
                        ? 'bg-purple-500/20 border border-purple-500/50 text-purple-300'
                        : 'bg-white/5 text-slate-400'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {filteredWithdrawals.map((wth) => (
                <div key={wth.id} className="p-5 rounded-3xl bg-[#0f0f15] border border-white/10 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-bold text-white">{wth.accountName}</h4>
                        <span className="text-xs text-indigo-400 font-mono">(@{wth.username})</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Method: <strong className="text-white uppercase">{wth.method}</strong> | Account Number:{' '}
                        <code className="text-indigo-300 bg-[#050508] px-2 py-0.5 rounded border border-white/10 font-mono">{wth.accountNumber}</code>
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-xl font-black text-amber-400 block">{formatCurrency(wth.amount)}</span>
                      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                        wth.status === 'pending' ? 'bg-amber-500/20 text-amber-300' : wth.status === 'approved' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                      }`}>
                        {wth.status}
                      </span>
                    </div>
                  </div>

                  {wth.status === 'pending' && (
                    <div className="flex items-center gap-3 pt-2 border-t border-white/5">
                      <button
                        onClick={() => handleProcessWithdrawal(wth.id, 'approved')}
                        className="flex-1 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                      >
                        Approve Cashout
                      </button>
                      <button
                        onClick={() => handleProcessWithdrawal(wth.id, 'rejected')}
                        className="flex-1 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs"
                      >
                        Reject & Refund Balance
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {filteredWithdrawals.length === 0 && (
                <div className="p-12 text-center text-slate-500 text-xs bg-[#0f0f15] rounded-3xl border border-white/5">
                  No withdrawal requests found for selected filter.
                </div>
              )}
            </div>
          </div>
        )}

        {/* SECTION 6: ANALYTICS & REPORTS */}
        {activeTab === 'analytics' && analytics && (
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-[#0f0f15] border border-white/10 space-y-4">
              <h3 className="text-lg font-black text-white">Platform Health & System Financial Summary</h3>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-1">
                  <span className="text-slate-400 font-medium">Total Registered Users</span>
                  <p className="text-2xl font-black text-white">{analytics.totalUsers}</p>
                </div>

                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-1">
                  <span className="text-slate-400 font-medium">Distributed Task Rewards</span>
                  <p className="text-2xl font-black text-amber-400">{formatCurrency(analytics.totalRewardsDistributedBirr)}</p>
                </div>

                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-1">
                  <span className="text-slate-400 font-medium">Pending Withdrawal Volume</span>
                  <p className="text-2xl font-black text-purple-400">{formatCurrency(analytics.totalPendingWithdrawalsBirr)}</p>
                </div>
              </div>

              <div className="pt-4 border-t border-white/10 flex justify-end">
                <button
                  onClick={handleExportCSV}
                  className="py-3 px-5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/20"
                >
                  <Download className="w-4 h-4" />
                  <span>Export User Activity Report (CSV)</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 7: NOTIFICATIONS & BROADCASTS */}
        {activeTab === 'notifications' && (
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-[#0f0f15] border border-white/10 space-y-4">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Send className="w-5 h-5 text-indigo-400" /> Broadcast System Announcement
              </h3>

              <form onSubmit={handleSendBroadcast} className="space-y-4 text-xs">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Announcement Title</label>
                  <input
                    type="text"
                    value={broadcastTitle}
                    onChange={(e) => setBroadcastTitle(e.target.value)}
                    placeholder="e.g., 🚀 New High Yield Tasks Added!"
                    className="w-full bg-[#050508] border border-white/10 rounded-2xl p-3 text-white focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Message Content</label>
                  <textarea
                    value={broadcastMessage}
                    onChange={(e) => setBroadcastMessage(e.target.value)}
                    placeholder="Enter broadcast message details for Telegram Mini App users..."
                    className="w-full bg-[#050508] border border-white/10 rounded-2xl p-3 text-white h-24 focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Target Audience</label>
                  <select
                    value={broadcastAudience}
                    onChange={(e) => setBroadcastAudience(e.target.value as any)}
                    className="w-full bg-[#050508] border border-white/10 rounded-2xl p-3 text-white"
                  >
                    <option value="all">All Platform Users</option>
                    <option value="active">Active Verified Accounts Only</option>
                    <option value="blocked">Suspended / Flagged Accounts Only</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={isSendingBroadcast}
                  className="py-3 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-500 font-extrabold text-white text-xs shadow-lg shadow-indigo-600/20"
                >
                  {isSendingBroadcast ? 'Broadcasting...' : 'Broadcast Announcement'}
                </button>
              </form>
            </div>

            {/* Broadcast History */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-white">Broadcast History Log ({broadcasts.length})</h4>
              {broadcasts.map((bc) => (
                <div key={bc.id} className="p-4 rounded-2xl bg-[#0f0f15] border border-white/10 space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <h5 className="font-bold text-white">{bc.title}</h5>
                    <span className="text-[10px] text-indigo-400">{bc.recipientCount} Recipients</span>
                  </div>
                  <p className="text-slate-400">{bc.message}</p>
                  <p className="text-[10px] text-slate-500 pt-1">Sent: {formatDate(bc.sentAt)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SECTION 8: SYSTEM SETTINGS */}
        {activeTab === 'settings' && (
          <div className="p-6 rounded-3xl bg-[#0f0f15] border border-white/10 space-y-6">
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <Settings className="w-5 h-5 text-indigo-400" /> Platform Configuration
            </h3>

            <form onSubmit={handleSaveSettings} className="space-y-4 text-xs max-w-lg">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Minimum Withdrawal Threshold (Birr)</label>
                <input
                  type="number"
                  value={settingMinWithdrawal}
                  onChange={(e) => setSettingMinWithdrawal(e.target.value)}
                  className="w-full bg-[#050508] border border-white/10 rounded-2xl p-3 text-white font-mono font-bold"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">System Announcement Notice</label>
                <input
                  type="text"
                  value={settingNotice}
                  onChange={(e) => setSettingNotice(e.target.value)}
                  className="w-full bg-[#050508] border border-white/10 rounded-2xl p-3 text-white"
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
                <div>
                  <p className="font-bold text-white">Maintenance Mode</p>
                  <p className="text-[11px] text-slate-400">Temporarily restrict new user actions during maintenance</p>
                </div>
                <input
                  type="checkbox"
                  checked={settingMaintenance}
                  onChange={(e) => setSettingMaintenance(e.target.checked)}
                  className="w-5 h-5 accent-indigo-500 rounded cursor-pointer"
                />
              </div>

              <button
                type="submit"
                className="py-3 px-6 rounded-2xl bg-purple-600 hover:bg-purple-500 font-extrabold text-white text-xs shadow-lg shadow-purple-600/20"
              >
                Save Settings
              </button>
            </form>
          </div>
        )}
      </main>

      {/* CREATE TASK MODAL */}
      {showCreateTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#0f0f18] border border-white/10 rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white">Create New Task</h3>
              <button onClick={() => setShowCreateTaskModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 block mb-1">Task Title</label>
                <input
                  type="text"
                  required
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="w-full bg-[#050508] border border-white/10 rounded-xl p-2.5 text-white"
                  placeholder="Subscribe YouTube Channel"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1">Description</label>
                <textarea
                  required
                  value={newTaskDesc}
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                  className="w-full bg-[#050508] border border-white/10 rounded-xl p-2.5 text-white"
                  placeholder="Subscribe and submit your YouTube channel handle"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-300 block mb-1">Platform</label>
                  <select
                    value={newTaskPlatform}
                    onChange={(e) => setNewTaskPlatform(e.target.value)}
                    className="w-full bg-[#050508] border border-white/10 rounded-xl p-2 text-white"
                  >
                    <option value="telegram">Telegram</option>
                    <option value="youtube">YouTube</option>
                    <option value="instagram">Instagram</option>
                    <option value="facebook">Facebook</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">Verification Engine</label>
                  <select
                    value={newTaskVerification}
                    onChange={(e) => setNewTaskVerification(e.target.value as VerificationType)}
                    className="w-full bg-[#050508] border border-white/10 rounded-xl p-2 text-white"
                  >
                    <option value="channel_join">Telegram API Check</option>
                    <option value="admin_check">Admin Proof Review</option>
                    <option value="link_visit">Timer / Link Visit</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-300 block mb-1">Reward Birr</label>
                  <input
                    type="number"
                    value={newTaskRewardBirr}
                    onChange={(e) => setNewTaskRewardBirr(e.target.value)}
                    className="w-full bg-[#050508] border border-white/10 rounded-xl p-2 text-white font-bold"
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">Reward Points</label>
                  <input
                    type="number"
                    value={newTaskRewardPoints}
                    onChange={(e) => setNewTaskRewardPoints(e.target.value)}
                    className="w-full bg-[#050508] border border-white/10 rounded-xl p-2 text-white font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 block mb-1">Target URL / Channel Username</label>
                <input
                  type="text"
                  value={newTaskTargetUrl}
                  onChange={(e) => setNewTaskTargetUrl(e.target.value)}
                  className="w-full bg-[#050508] border border-white/10 rounded-xl p-2.5 text-white font-mono"
                  placeholder="https://youtube.com/@channel or @channel_username"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 font-extrabold text-white text-xs shadow-lg shadow-indigo-500/20 mt-2"
              >
                Save & Publish Task
              </button>
            </form>
          </div>
        </div>
      )}

      {/* BALANCE EDIT MODAL */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-sm bg-[#0f0f18] border border-white/10 rounded-3xl p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">Adjust User Balance</h3>
            <p className="text-xs text-slate-400">User: {editingUser.firstName} (@{editingUser.username})</p>

            <input
              type="number"
              value={editBalanceVal}
              onChange={(e) => setEditBalanceVal(e.target.value)}
              className="w-full bg-[#050508] border border-white/10 rounded-2xl p-3 text-white text-lg font-bold font-mono"
            />

            <div className="flex gap-2">
              <button onClick={() => setEditingUser(null)} className="flex-1 py-2.5 rounded-xl bg-white/10 text-slate-300 text-xs font-bold">
                Cancel
              </button>
              <button onClick={handleSaveUserBalance} className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold">
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
