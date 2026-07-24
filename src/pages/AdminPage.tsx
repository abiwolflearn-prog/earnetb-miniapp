import React, { useState, useEffect } from 'react';
import { AdminAnalytics, Task, Withdrawal, User, TaskCategory, VerificationType, TaskSubmission } from '../types';
import { Shield, Lock, Users, CheckSquare, Wallet, AlertCircle, CheckCircle2, X, Plus, Trash2, Edit3, Ban, RefreshCw, Bot, ArrowLeft, Clock, Eye, AlertTriangle } from 'lucide-react';

interface AdminPageProps {
  onBackToApp: () => void;
  onShowToast: (title: string, message?: string, type?: 'success' | 'error' | 'info') => void;
}

export const AdminPage: React.FC<AdminPageProps> = ({ onBackToApp, onShowToast }) => {
  const [adminToken, setAdminToken] = useState<string | null>(
    typeof localStorage !== 'undefined' ? localStorage.getItem('novatask_admin_jwt') : null
  );
  const [password, setPassword] = useState<string>('admin123');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  // Admin Data State
  const [activeTab, setActiveTab] = useState<'analytics' | 'submissions' | 'tasks' | 'withdrawals' | 'users' | 'bot'>('analytics');
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [submissions, setSubmissions] = useState<TaskSubmission[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // New Task Form State
  const [showCreateTaskModal, setShowCreateTaskModal] = useState<boolean>(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState<TaskCategory>('social');
  const [newTaskRewardBirr, setNewTaskRewardBirr] = useState('150');
  const [newTaskRewardPoints, setNewTaskRewardPoints] = useState('1500');
  const [newTaskVerification, setNewTaskVerification] = useState<VerificationType>('admin_check');
  const [newTaskTargetUrl, setNewTaskTargetUrl] = useState('');
  const [newTaskPlatform, setNewTaskPlatform] = useState<string>('telegram');

  // User Balance Edit Modal State
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editBalanceVal, setEditBalanceVal] = useState<string>('');

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
      onShowToast('Admin Session Authenticated', 'Welcome to NovaTask Admin Dashboard', 'success');
    } catch (err: any) {
      setLoginError(err.message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const fetchAdminData = async () => {
    if (!adminToken) return;
    setIsLoading(true);
    try {
      const headers = { Authorization: `Bearer ${adminToken}` };

      const [statsRes, tasksRes, subRes, wthRes, usersRes] = await Promise.all([
        fetch('/api/admin/stats', { headers }),
        fetch('/api/tasks', { headers: { 'x-telegram-init-data': 'user={"id":987654321}' } }),
        fetch('/api/admin/submissions', { headers }),
        fetch('/api/admin/withdrawals', { headers }),
        fetch('/api/admin/users', { headers })
      ]);

      const statsData = await statsRes.json();
      const tasksData = await tasksRes.json();
      const subData = await subRes.json();
      const wthData = await wthRes.json();
      const usersData = await usersRes.json();

      if (statsData.analytics) setAnalytics(statsData.analytics);
      if (tasksData.tasks) setTasks(tasksData.tasks);
      if (subData.submissions) setSubmissions(subData.submissions);
      if (wthData.withdrawals) setWithdrawals(wthData.withdrawals);
      if (usersData.users) setUsers(usersData.users);
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
      onShowToast(`Submission ${status.toUpperCase()}`, `Task proof processed successfully.`, 'success');
      fetchAdminData();
    } catch (err: any) {
      onShowToast('Error', err.message, 'error');
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
      onShowToast('Task Created Successfully', newTaskTitle, 'success');
      setShowCreateTaskModal(false);
      fetchAdminData();
    } catch (err: any) {
      onShowToast('Error', err.message, 'error');
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
        onShowToast('Task Deleted', 'Task removed from database', 'info');
        fetchAdminData();
      }
    } catch (err: any) {
      onShowToast('Error', err.message, 'error');
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
      onShowToast(`Withdrawal ${status.toUpperCase()}`, `Request status updated.`, 'success');
      fetchAdminData();
    } catch (err: any) {
      onShowToast('Error', err.message, 'error');
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
        onShowToast('User Status Updated', `Account ${!currentIsBlocked ? 'Blocked' : 'Unblocked'}`, 'info');
        fetchAdminData();
      }
    } catch (err: any) {
      onShowToast('Error', err.message, 'error');
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
        onShowToast('Balance Updated', `User balance updated to ${editBalanceVal} Birr`, 'success');
        setEditingUser(null);
        fetchAdminData();
      }
    } catch (err: any) {
      onShowToast('Error', err.message, 'error');
    }
  };

  // Login Screen if no JWT token
  if (!adminToken) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-[#0f0f15] border border-white/10 rounded-3xl p-6 space-y-5 shadow-2xl relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-28 h-28 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="text-center space-y-2 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center mx-auto">
              <Shield className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-extrabold text-white">NovaTask Admin Login</h3>
            <p className="text-xs text-slate-400">Enter secure admin password to manage platform</p>
          </div>

          {loginError && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-950/50 border border-rose-500/30 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-4 relative z-10">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Admin Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#050508] border border-white/10 rounded-2xl pl-9 pr-3 py-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                  placeholder="admin123"
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Default password: <code className="text-indigo-400">admin123</code></p>
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:brightness-110 font-extrabold text-white text-xs shadow-lg shadow-indigo-500/25 transition-all"
            >
              {isLoggingIn ? 'Authenticating...' : 'Authenticate Admin Session'}
            </button>
          </form>

          <button
            onClick={onBackToApp}
            className="w-full text-center text-xs text-slate-400 hover:text-white pt-2 flex items-center justify-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Return to Mini App
          </button>
        </div>
      </div>
    );
  }

  const pendingSubmissionsCount = submissions.filter(s => s.status === 'pending').length;

  return (
    <div className="space-y-5 pb-24">
      {/* Top Bar */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToApp}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/5 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-400" /> NovaTask Admin Panel
            </h2>
            <p className="text-xs text-slate-400">System Management & Approvals</p>
          </div>
        </div>

        <button
          onClick={fetchAdminData}
          className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-indigo-400 border border-white/5 transition-colors"
          title="Refresh Data"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
        </button>
      </div>

      {/* Admin Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        {[
          { id: 'analytics', label: 'Analytics', icon: Shield },
          { id: 'submissions', label: 'Proof Approvals', icon: Clock, badge: pendingSubmissionsCount },
          { id: 'tasks', label: 'Manage Tasks', icon: CheckSquare },
          { id: 'withdrawals', label: 'Cashout Requests', icon: Wallet, badge: withdrawals.filter(w => w.status === 'pending').length },
          { id: 'users', label: 'User Security & Anti-Fraud', icon: Users },
          { id: 'bot', label: 'Bot Setup', icon: Bot }
        ].map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                isSelected
                  ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                  : 'bg-[#0f0f15] border-white/10 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {Boolean(tab.badge && tab.badge > 0) && (
                <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-bold">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: ANALYTICS OVERVIEW */}
      {activeTab === 'analytics' && analytics && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-3xl bg-[#0f0f15] border border-white/5 space-y-1">
              <span className="text-xs text-slate-400 font-medium">Total Registered Users</span>
              <p className="text-2xl font-black text-white">{analytics.totalUsers}</p>
            </div>
            <div className="p-4 rounded-3xl bg-[#0f0f15] border border-white/5 space-y-1">
              <span className="text-xs text-slate-400 font-medium">Pending Proof Submissions</span>
              <p className="text-2xl font-black text-amber-400">{analytics.pendingSubmissionsCount || 0}</p>
            </div>
            <div className="p-4 rounded-3xl bg-[#0f0f15] border border-white/5 space-y-1">
              <span className="text-xs text-slate-400 font-medium">Completed Tasks</span>
              <p className="text-2xl font-black text-emerald-400">{analytics.completedTasksCount}</p>
            </div>
            <div className="p-4 rounded-3xl bg-[#0f0f15] border border-white/5 space-y-1">
              <span className="text-xs text-slate-400 font-medium">Distributed Rewards</span>
              <p className="text-2xl font-black text-amber-400">{analytics.totalRewardsDistributedBirr.toLocaleString()} Birr</p>
            </div>
            <div className="p-4 rounded-3xl bg-[#0f0f15] border border-white/5 space-y-1">
              <span className="text-xs text-slate-400 font-medium">Pending Withdrawals</span>
              <p className="text-2xl font-black text-purple-400">{analytics.totalPendingWithdrawalsBirr.toLocaleString()} Birr</p>
            </div>
            <div className="p-4 rounded-3xl bg-[#0f0f15] border border-white/5 space-y-1">
              <span className="text-xs text-slate-400 font-medium">Suspended & Flagged Accounts</span>
              <p className="text-2xl font-black text-rose-400">{analytics.blockedUsersCount} ({analytics.flaggedUsersCount || 0} Flagged)</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PROOF APPROVALS (SUBMISSIONS QUEUE) */}
      {activeTab === 'submissions' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white">Social Task Proof Submissions ({submissions.length})</h3>
            <span className="text-xs text-slate-400">{pendingSubmissionsCount} Pending Review</span>
          </div>

          <div className="space-y-3">
            {submissions.map((sub) => (
              <div key={sub.id} className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        {sub.platform || sub.category}
                      </span>
                      <span className="text-xs text-indigo-400 font-semibold">User @{sub.username || sub.telegramId}</span>
                    </div>
                    <h4 className="text-sm font-bold text-white">{sub.taskTitle}</h4>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black text-amber-400 block">+{sub.rewardBirr} Birr</span>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                      sub.status === 'pending' ? 'bg-amber-500/20 text-amber-300' : sub.status === 'approved' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                    }`}>
                      {sub.status}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#050508] border border-white/10 text-xs space-y-1">
                  <span className="text-slate-400 text-[10px] font-bold uppercase">Submitted Proof Detail:</span>
                  <p className="text-white font-mono break-all">{sub.proofData}</p>
                </div>

                {sub.status === 'pending' && (
                  <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                    <button
                      onClick={() => handleProcessSubmission(sub.id, 'approved')}
                      className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                    >
                      Approve & Credit Reward
                    </button>
                    <button
                      onClick={() => handleProcessSubmission(sub.id, 'rejected')}
                      className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs"
                    >
                      Reject Proof
                    </button>
                  </div>
                )}
              </div>
            ))}

            {submissions.length === 0 && (
              <div className="p-8 rounded-3xl bg-[#0f0f15] border border-white/5 text-center text-slate-400 text-xs">
                No task submissions in queue.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: TASKS MANAGER */}
      {activeTab === 'tasks' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white">Platform Tasks ({tasks.length})</h3>
            <button
              onClick={() => setShowCreateTaskModal(true)}
              className="py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:brightness-110 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-500/20"
            >
              <Plus className="w-4 h-4" /> Create New Task
            </button>
          </div>

          <div className="space-y-2">
            {tasks.map((task) => (
              <div key={task.id} className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-500/10 text-purple-300 border border-purple-500/20">
                      {task.platform || task.category}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">ID: {task.id}</span>
                  </div>
                  <h4 className="text-sm font-bold text-white">{task.title}</h4>
                  <p className="text-xs text-slate-400">{task.rewardBirr} Birr | Verification: <code className="text-indigo-300">{task.verificationType}</code></p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleDeleteTask(task.id)}
                    className="p-2 rounded-xl bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-500/30"
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

      {/* TAB 4: WITHDRAWAL APPROVALS */}
      {activeTab === 'withdrawals' && (
        <div className="space-y-3">
          <h3 className="text-base font-bold text-white">Withdrawal Requests</h3>

          <div className="space-y-2.5">
            {withdrawals.map((wth) => (
              <div key={wth.id} className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">{wth.accountName}</span>
                      <span className="text-xs text-indigo-400">(@{wth.username})</span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Method: <strong className="text-white uppercase">{wth.method}</strong> | Account: <code className="text-indigo-300 bg-[#050508] px-1.5 py-0.5 rounded border border-white/5">{wth.accountNumber}</code>
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-extrabold text-amber-400 block">{wth.amount.toLocaleString()} Birr</span>
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                      wth.status === 'pending' ? 'bg-amber-500/20 text-amber-300' : wth.status === 'approved' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                    }`}>
                      {wth.status}
                    </span>
                  </div>
                </div>

                {wth.status === 'pending' && (
                  <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                    <button
                      onClick={() => handleProcessWithdrawal(wth.id, 'approved')}
                      className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                    >
                      Approve Cashout
                    </button>
                    <button
                      onClick={() => handleProcessWithdrawal(wth.id, 'rejected')}
                      className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs"
                    >
                      Reject & Refund
                    </button>
                  </div>
                )}
              </div>
            ))}

            {withdrawals.length === 0 && (
              <div className="p-8 rounded-3xl bg-[#0f0f15] border border-white/5 text-center text-slate-400 text-xs">
                No withdrawal requests found.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: USERS & FRAUD DETECTION */}
      {activeTab === 'users' && (
        <div className="space-y-3">
          <h3 className="text-base font-bold text-white">Registered Telegram Users & Anti-Fraud Logs ({users.length})</h3>

          <div className="space-y-2">
            {users.map((u) => (
              <div key={u.id} className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img src={u.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'} className="w-10 h-10 rounded-xl object-cover" />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-bold text-white">{u.firstName} {u.lastName || ''}</p>
                        {u.isBlocked && <span className="px-1.5 py-0.2 rounded text-[9px] bg-rose-500/20 text-rose-300 font-bold">SUSPENDED</span>}
                      </div>
                      <p className="text-[10px] text-slate-400">ID: {u.telegramId} | @{u.username}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditingUser(u);
                        setEditBalanceVal(u.balance.toString());
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-amber-300 text-xs font-bold"
                    >
                      {u.balance} Birr
                    </button>
                    <button
                      onClick={() => handleToggleBlockUser(u.id, u.isBlocked)}
                      className={`p-2 rounded-xl text-xs font-bold ${
                        u.isBlocked ? 'bg-emerald-950 text-emerald-300' : 'bg-rose-950 text-rose-300'
                      }`}
                    >
                      <Ban className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Fraud Risk Score & Flags */}
                <div className="flex items-center justify-between text-[11px] pt-2 border-t border-white/5 text-slate-400">
                  <div className="flex items-center gap-2">
                    <span>Risk Score: <strong className={u.riskScore && u.riskScore > 50 ? 'text-rose-400' : 'text-emerald-400'}>{u.riskScore || 0}%</strong></span>
                    {u.fraudFlags && u.fraudFlags.length > 0 && (
                      <span className="flex items-center gap-1 text-amber-400 font-semibold">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {u.fraudFlags.join(', ')}
                      </span>
                    )}
                  </div>
                  <span>IP History: {u.ipAddresses?.join(', ') || u.lastIp || 'N/A'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: BOT SETUP */}
      {activeTab === 'bot' && (
        <div className="p-5 rounded-3xl bg-[#0f0f15] border border-white/5 space-y-4 text-xs text-slate-300">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Bot className="w-5 h-5 text-indigo-400" /> Telegram Bot Integration Status
          </h3>

          <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 space-y-1">
            <p className="font-bold">Active Bot Username: @EtNovaTasksbot</p>
            <p className="text-[11px] text-slate-300">Token configured: <code className="text-amber-300 font-mono">8949365811:AAGY...</code></p>
          </div>

          <div className="space-y-3 leading-relaxed">
            <p>1️⃣ Send <code className="text-indigo-300">/start</code> to <strong className="text-indigo-300">@EtNovaTasksbot</strong> on Telegram.</p>
            <p>2️⃣ For Telegram channel join verification: Add <strong className="text-amber-300">@EtNovaTasksbot</strong> as an Administrator in your target channel.</p>
          </div>
        </div>
      )}

      {/* CREATE TASK MODAL */}
      {showCreateTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-base font-bold text-white">Create New Task</h3>
              <button onClick={() => setShowCreateTaskModal(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-3">
              <div>
                <label className="text-xs text-slate-300">Task Title</label>
                <input type="text" required value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white" placeholder="Subscribe YouTube Channel" />
              </div>

              <div>
                <label className="text-xs text-slate-300">Description</label>
                <textarea required value={newTaskDesc} onChange={(e) => setNewTaskDesc(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white" placeholder="Subscribe and submit YouTube handle" />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-300">Social Platform</label>
                  <select value={newTaskPlatform} onChange={(e) => setNewTaskPlatform(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white">
                    <option value="telegram">Telegram</option>
                    <option value="youtube">YouTube</option>
                    <option value="instagram">Instagram</option>
                    <option value="facebook">Facebook</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-300">Verification Engine</label>
                  <select value={newTaskVerification} onChange={(e) => setNewTaskVerification(e.target.value as VerificationType)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white">
                    <option value="channel_join">Telegram API Check</option>
                    <option value="admin_check">Admin Proof Review</option>
                    <option value="link_visit">Timer / Link Visit</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-300">Reward Birr</label>
                  <input type="number" value={newTaskRewardBirr} onChange={(e) => setNewTaskRewardBirr(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white" />
                </div>
                <div>
                  <label className="text-xs text-slate-300">Reward Points</label>
                  <input type="number" value={newTaskRewardPoints} onChange={(e) => setNewTaskRewardPoints(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white" />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-300">Target URL / Channel Username</label>
                <input type="text" value={newTaskTargetUrl} onChange={(e) => setNewTaskTargetUrl(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white" placeholder="https://youtube.com/@channel or @channel_username" />
              </div>

              <button type="submit" className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 font-bold text-white text-xs">Save Task</button>
            </form>
          </div>
        </div>
      )}

      {/* EDIT USER BALANCE MODAL */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">Adjust User Balance</h3>
            <p className="text-xs text-slate-400">User: {editingUser.firstName} (@{editingUser.username})</p>

            <input
              type="number"
              value={editBalanceVal}
              onChange={(e) => setEditBalanceVal(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-lg font-bold"
            />

            <div className="flex gap-2">
              <button onClick={() => setEditingUser(null)} className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold">Cancel</button>
              <button onClick={handleSaveUserBalance} className="flex-1 py-2.5 rounded-xl bg-cyan-500 text-slate-950 text-xs font-bold">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
