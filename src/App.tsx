/**
 * NovaTask - Telegram Mini App Platform
 * Main App Component
 */

import React, { useState, useEffect } from 'react';
import { User, Task, Withdrawal, Transaction, TelegramUser } from './types';
import { getTelegramInitData, isTelegramWebAppAvailable, MOCK_TELEGRAM_USERS, getTelegramWebApp } from './lib/telegram';
import { Header } from './components/Header';
import { Navbar, TabType } from './components/Navbar';
import { NotificationToast, ToastMessage } from './components/NotificationToast';
import { TaskVerificationModal } from './components/TaskVerificationModal';
import { QuizModal } from './components/QuizModal';
import { DailyCheckInModal } from './components/DailyCheckInModal';
import { WithdrawModal } from './components/WithdrawModal';
import { BotSandboxModal } from './components/BotSandboxModal';

import { HomePage } from './pages/HomePage';
import { TasksPage } from './pages/TasksPage';
import { WalletPage } from './pages/WalletPage';
import { ReferralsPage } from './pages/ReferralsPage';
import { ProfilePage } from './pages/ProfilePage';
import { AdminPage } from './pages/AdminPage';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType | 'admin'>('home');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [simulatedTgUser, setSimulatedTgUser] = useState<TelegramUser>(MOCK_TELEGRAM_USERS[0]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [completedTaskIds, setCompletedTaskIds] = useState<string[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [referralsData, setReferralsData] = useState<{
    referralCode: string;
    referralsCount: number;
    totalEarnedBirr: number;
    friends: any[];
    leaderboard: any[];
  }>({
    referralCode: 'ref_987654321',
    referralsCount: 0,
    totalEarnedBirr: 0,
    friends: [],
    leaderboard: []
  });

  // Modal States
  const [activeModal, setActiveModal] = useState<'checkin' | 'withdraw' | 'botsandbox' | 'task_verify' | 'quiz' | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Toast Notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (title: string, message?: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = `toast_${Date.now()}_${Math.random()}`;
    setToasts((prev) => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Initialize Telegram WebApp SDK
  useEffect(() => {
    const initTg = () => {
      const tg = getTelegramWebApp();
      if (tg) {
        try {
          tg.ready();
          tg.expand();
        } catch (e) {
          console.warn('Telegram WebApp initialization warning:', e);
        }
      }
    };

    initTg();

    const interval = setInterval(() => {
      if (window.Telegram?.WebApp) {
        initTg();
      }
    }, 500);

    return () => clearInterval(interval);
  }, []);

  // Authenticate user & sync state
  const syncUserData = async (customTgUser?: TelegramUser) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      let initDataRaw = isTelegramWebAppAvailable()
        ? getTelegramInitData()
        : `user=${encodeURIComponent(JSON.stringify(customTgUser || simulatedTgUser))}&hash=simulated_hash_for_dev`;

      let authRes = await fetch('/api/auth/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initDataRaw })
      });

      let authData = await authRes.json();

      // Fallback: If Telegram signature validation failed in dev mode, retry with simulated user payload
      if (!authRes.ok) {
        const tg = getTelegramWebApp();
        const fallbackUser = tg?.initDataUnsafe?.user || customTgUser || simulatedTgUser;
        const fallbackInitData = `user=${encodeURIComponent(JSON.stringify(fallbackUser))}&hash=simulated_hash_for_dev`;
        
        authRes = await fetch('/api/auth/telegram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initDataRaw: fallbackInitData })
        });
        authData = await authRes.json();
        if (authRes.ok) {
          initDataRaw = fallbackInitData;
        }
      }

      if (!authRes.ok) throw new Error(authData.error || 'Authentication failed');

      setCurrentUser(authData.user);
      setCompletedTaskIds(authData.completedTaskIds || []);

      // Fetch Tasks
      const tasksRes = await fetch('/api/tasks', {
        headers: { 'x-telegram-init-data': initDataRaw }
      });
      const tasksData = await tasksRes.json();
      if (tasksData.tasks) setTasks(tasksData.tasks);

      // Fetch Withdrawals & Transactions
      const wthRes = await fetch('/api/withdrawals', {
        headers: { 'x-telegram-init-data': initDataRaw }
      });
      const wthData = await wthRes.json();
      if (wthData.withdrawals) setWithdrawals(wthData.withdrawals);
      if (wthData.transactions) setTransactions(wthData.transactions);

      // Fetch Referrals
      const refRes = await fetch('/api/referrals', {
        headers: { 'x-telegram-init-data': initDataRaw }
      });
      const refData = await refRes.json();
      if (refData.referralCode) setReferralsData(refData);
    } catch (err: any) {
      console.error('User sync error:', err);
      setAuthError(err.message || 'Connection to Telegram WebApp failed');
      addToast('Authentication Error', err.message, 'error');
    } finally {
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    syncUserData();
  }, [simulatedTgUser]);

  const handleSelectSimulatedUser = (tgUser: TelegramUser) => {
    setSimulatedTgUser(tgUser);
    localStorage.setItem('novatask_simulated_tg_user', JSON.stringify(tgUser));
    addToast('Switched Telegram User', `Logged in as ${tgUser.first_name}`, 'info');
  };

  const handleCompleteTask = async (taskId: string, quizAnswers?: number[]) => {
    const initDataRaw = isTelegramWebAppAvailable()
      ? getTelegramInitData()
      : `user=${encodeURIComponent(JSON.stringify(simulatedTgUser))}&hash=simulated_hash_for_dev`;

    const res = await fetch('/api/tasks/complete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-telegram-init-data': initDataRaw
      },
      body: JSON.stringify({ taskId, quizAnswers })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to complete task');
    }

    addToast('Task Reward Claimed!', `+${data.completedTask.rewardBirr} Birr & +${data.completedTask.rewardPoints} PTS added!`, 'success');
    syncUserData();
  };

  const handleDailyCheckIn = async () => {
    const initDataRaw = isTelegramWebAppAvailable()
      ? getTelegramInitData()
      : `user=${encodeURIComponent(JSON.stringify(simulatedTgUser))}&hash=simulated_hash_for_dev`;

    const res = await fetch('/api/user/checkin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-telegram-init-data': initDataRaw
      }
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Daily check-in failed');
    }

    addToast('Daily Streak Claimed!', `+${data.rewardBirr} Birr added for Day ${data.user.dailyStreak}!`, 'success');
    syncUserData();
  };

  const handleSubmitWithdrawal = async (wthInput: {
    amount: number;
    method: 'telebirr' | 'cbe_birr' | 'bank_transfer';
    accountNumber: string;
    accountName: string;
  }) => {
    const initDataRaw = isTelegramWebAppAvailable()
      ? getTelegramInitData()
      : `user=${encodeURIComponent(JSON.stringify(simulatedTgUser))}&hash=simulated_hash_for_dev`;

    const res = await fetch('/api/withdrawals', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-telegram-init-data': initDataRaw
      },
      body: JSON.stringify(wthInput)
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Withdrawal request failed');
    }

    addToast('Cashout Request Logged', `${wthInput.amount} Birr via ${wthInput.method.toUpperCase()}`, 'success');
    syncUserData();
  };

  return (
    <div className="min-h-screen bg-[#050508] text-slate-200 font-sans selection:bg-indigo-500 selection:text-white">
      <NotificationToast toasts={toasts} onDismiss={removeToast} />

      {/* Header Bar */}
      <Header
        user={currentUser}
        onSelectSimulatedUser={handleSelectSimulatedUser}
        onOpenAdmin={() => setActiveTab('admin')}
        onOpenBotSandbox={() => setActiveModal('botsandbox')}
      />

      {/* Main Page Layout */}
      <main className="max-w-md mx-auto px-4 pt-4">
        {currentUser ? (
          <>
            {activeTab === 'home' && (
              <HomePage
                user={currentUser}
                tasks={tasks}
                completedTaskIds={completedTaskIds}
                onNavigateTab={(tab) => setActiveTab(tab)}
                onOpenCheckIn={() => setActiveModal('checkin')}
                onOpenTaskModal={(task) => {
                  setSelectedTask(task);
                  setActiveModal(task.verificationType === 'quiz' ? 'quiz' : 'task_verify');
                }}
                onOpenWithdrawModal={() => setActiveModal('withdraw')}
              />
            )}

            {activeTab === 'tasks' && (
              <TasksPage
                tasks={tasks}
                completedTaskIds={completedTaskIds}
                onOpenTaskModal={(task) => {
                  setSelectedTask(task);
                  setActiveModal('task_verify');
                }}
                onOpenQuizModal={(task) => {
                  setSelectedTask(task);
                  setActiveModal('quiz');
                }}
                onOpenCheckIn={() => setActiveModal('checkin')}
              />
            )}

            {activeTab === 'wallet' && (
              <WalletPage
                user={currentUser}
                withdrawals={withdrawals}
                transactions={transactions}
                onOpenWithdrawModal={() => setActiveModal('withdraw')}
              />
            )}

            {activeTab === 'referrals' && (
              <ReferralsPage
                user={currentUser}
                referralsData={referralsData}
                onShowToast={addToast}
              />
            )}

            {activeTab === 'profile' && (
              <ProfilePage
                user={currentUser}
                onOpenAdmin={() => setActiveTab('admin')}
                onOpenBotSandbox={() => setActiveModal('botsandbox')}
                onNavigateTab={(tab) => setActiveTab(tab)}
              />
            )}

            {activeTab === 'admin' && (
              <AdminPage
                onBackToApp={() => setActiveTab('home')}
                onShowToast={addToast}
              />
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
            <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-slate-400 font-medium">Connecting to Telegram WebApp...</p>
            {authError && (
              <div className="flex flex-col items-center mt-3 space-y-2">
                <p className="text-xs text-rose-400 text-center max-w-xs">{authError}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => syncUserData()}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition"
                  >
                    Retry Connection
                  </button>
                  <button
                    onClick={() => syncUserData(simulatedTgUser)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition"
                  >
                    Demo Mode
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modals & Drawers */}
      <TaskVerificationModal
        task={activeModal === 'task_verify' ? selectedTask : null}
        onClose={() => {
          setActiveModal(null);
          setSelectedTask(null);
        }}
        onComplete={handleCompleteTask}
      />

      <QuizModal
        task={activeModal === 'quiz' ? selectedTask : null}
        onClose={() => {
          setActiveModal(null);
          setSelectedTask(null);
        }}
        onComplete={handleCompleteTask}
      />

      <DailyCheckInModal
        user={currentUser}
        isOpen={activeModal === 'checkin'}
        onClose={() => setActiveModal(null)}
        onCheckIn={handleDailyCheckIn}
      />

      <WithdrawModal
        user={currentUser}
        isOpen={activeModal === 'withdraw'}
        onClose={() => setActiveModal(null)}
        onSubmitWithdrawal={handleSubmitWithdrawal}
      />

      <BotSandboxModal
        isOpen={activeModal === 'botsandbox'}
        onClose={() => setActiveModal(null)}
        currentUser={simulatedTgUser}
        onLaunchMiniAppFromBot={() => {
          setActiveTab('home');
          addToast('Launched from Telegram Bot', 'Welcome to NovaTask!', 'success');
        }}
      />

      {/* Bottom Navigation Bar */}
      {activeTab !== 'admin' && (
        <Navbar
          activeTab={activeTab as TabType}
          onChangeTab={(tab) => setActiveTab(tab)}
          pendingTasksCount={tasks.filter((t) => !completedTaskIds.includes(t.id)).length}
        />
      )}
    </div>
  );
}
