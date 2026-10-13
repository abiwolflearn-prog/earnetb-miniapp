/**
 * EarnBirr - Telegram Mini App Platform
 * Main App Component
 */

import React, { useEffect, useState } from "react";
import { User, Task, Withdrawal, Transaction } from "./types";
import {
  getTelegramInitData,
  getTelegramWebApp,
} from "./lib/telegram";
import { API_URL } from "./lib/api";

import { Header } from "./components/Header";
import { Navbar, TabType } from "./components/Navbar";
import {
  NotificationToast,
  ToastMessage,
} from "./components/NotificationToast";

import { TaskVerificationModal } from "./components/TaskVerificationModal";
import { QuizModal } from "./components/QuizModal";
import { DailyCheckInModal } from "./components/DailyCheckInModal";
import { WithdrawModal } from "./components/WithdrawModal";

import { HomePage } from "./pages/HomePage";
import { TasksPage } from "./pages/TasksPage";
import { WalletPage } from "./pages/WalletPage";
import { ReferralsPage } from "./pages/ReferralsPage";
import { ProfilePage } from "./pages/ProfilePage";

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>("home");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [completedTaskIds, setCompletedTaskIds] = useState<string[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [referralsData, setReferralsData] = useState({
    referralCode: "ref_987654321",
    referralsCount: 0,
    totalEarnedBirr: 0,
    friends: [],
    leaderboard: [],
  });

  const [activeModal, setActiveModal] = useState<
    "checkin" | "withdraw" | "task_verify" | "quiz" | null
  >(null);

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (
    title: string,
    message?: string,
    type: "success" | "error" | "info" = "info"
  ) => {
    const id = `toast_${Date.now()}`;
    setToasts((prev) => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  };

  useEffect(() => {
    const tg = getTelegramWebApp();
    if (tg) {
      try {
        tg.ready();
        tg.expand();
      } catch (e) {
        console.warn("Telegram WebApp init error:", e);
      }
    }
  }, []);

  // Authenticate user and load app data
  const syncUserData = async () => {
    try {
      const initDataRaw = getTelegramInitData();

      // Check for start_param (referral code) from Telegram or URL query param
      const tg = getTelegramWebApp();
      const urlParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
      const referredByCode = tg?.initDataUnsafe?.start_param || urlParams?.get("startapp") || urlParams?.get("ref") || undefined;

      // Authenticate with backend
      const authRes = await fetch(`${API_URL}/api/auth/telegram`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          initDataRaw,
          referredByCode,
        }),
      });

      const authData = await authRes.json();

      if (!authRes.ok) {
        throw new Error(authData.error || "Authentication failed");
      }

      setCurrentUser(authData.user);
      setCompletedTaskIds(authData.completedTaskIds || []);

      // Get tasks
      const tasksRes = await fetch(`${API_URL}/api/tasks`, {
        headers: {
          "x-telegram-init-data": initDataRaw,
        },
      });

      const tasksData = await tasksRes.json();
      if (tasksData.tasks) {
        setTasks(tasksData.tasks);
      }

      // Get withdrawals & transactions
      const withdrawalsRes = await fetch(`${API_URL}/api/withdrawals`, {
        headers: {
          "x-telegram-init-data": initDataRaw,
        },
      });

      const withdrawalsData = await withdrawalsRes.json();
      if (withdrawalsData.withdrawals) {
        setWithdrawals(withdrawalsData.withdrawals);
      }
      if (withdrawalsData.transactions) {
        setTransactions(withdrawalsData.transactions);
      }

      // Get referrals info
      const referralRes = await fetch(`${API_URL}/api/referrals`, {
        headers: {
          "x-telegram-init-data": initDataRaw,
        },
      });

      const referralData = await referralRes.json();
      if (referralData.referralCode) {
        setReferralsData(referralData);
      }
    } catch (error: any) {
      console.error("User sync error:", error);
      addToast("Authentication Error", error.message, "error");
    }
  };

  useEffect(() => {
    syncUserData();
  }, []);

  // Complete Task
  const handleCompleteTask = async (
    taskId: string,
    quizAnswers?: number[]
  ) => {
    try {
      const initDataRaw = getTelegramInitData();

      const res = await fetch(`${API_URL}/api/tasks/complete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-telegram-init-data": initDataRaw,
        },
        body: JSON.stringify({
          taskId,
          quizAnswers,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to complete task");
      }

      addToast(
        "Reward Earned!",
        `+${data.rewardBirr} Birr & +${data.rewardPoints} Points added to your balance!`,
        "success"
      );

      setActiveModal(null);
      setSelectedTask(null);
      syncUserData();
    } catch (error: any) {
      addToast("Verification Failed", error.message, "error");
    }
  };

  // Daily Check-in
  const handleDailyCheckIn = async () => {
    try {
      const initDataRaw = getTelegramInitData();

      const res = await fetch(`${API_URL}/api/user/checkin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-telegram-init-data": initDataRaw,
        },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Daily check-in failed");
      }

      addToast(
        "Daily Streak Claimed!",
        `+${data.rewardBirr} Birr added for Day ${data.user.dailyStreak}!`,
        "success"
      );

      syncUserData();
    } catch (error: any) {
      addToast("Check-in Error", error.message, "error");
    }
  };

  // Withdrawal
  const handleSubmitWithdrawal = async (wthInput: {
    amount: number;
    method: "telebirr" | "cbe_birr" | "bank_transfer";
    accountNumber: string;
    accountName: string;
  }) => {
    try {
      const initDataRaw = getTelegramInitData();

      const res = await fetch(`${API_URL}/api/withdrawals`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-telegram-init-data": initDataRaw,
        },
        body: JSON.stringify(wthInput),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Withdrawal failed");
      }

      addToast(
        "Cashout Request Logged",
        `${wthInput.amount} Birr via ${wthInput.method.toUpperCase()}`,
        "success"
      );

      syncUserData();
    } catch (error: any) {
      addToast("Withdrawal Error", error.message, "error");
    }
  };

  return (
    <div className="min-h-screen bg-[#050508] text-slate-200 font-sans antialiased flex flex-col selection:bg-indigo-500/30">
      <NotificationToast toasts={toasts} onDismiss={removeToast} />

      <Header
        user={currentUser}
        onNavigateProfile={() => setActiveTab("profile")}
      />

      <main className="w-full max-w-md mx-auto px-3.5 pt-2 pb-24 flex-1">
        {currentUser ? (
          <>
            {activeTab === "home" && (
              <HomePage
                user={currentUser}
                tasks={tasks}
                completedTaskIds={completedTaskIds}
                onNavigateTab={(tab) => setActiveTab(tab)}
                onOpenCheckIn={() => setActiveModal("checkin")}
                onOpenTaskModal={(task) => {
                  setSelectedTask(task);
                  setActiveModal(task.verificationType === "quiz" ? "quiz" : "task_verify");
                }}
                onOpenWithdrawModal={() => setActiveModal("withdraw")}
              />
            )}

            {activeTab === "tasks" && (
              <TasksPage
                tasks={tasks}
                completedTaskIds={completedTaskIds}
                onOpenTaskModal={(task) => {
                  setSelectedTask(task);
                  setActiveModal("task_verify");
                }}
                onOpenQuizModal={(task) => {
                  setSelectedTask(task);
                  setActiveModal("quiz");
                }}
                onOpenCheckIn={() => setActiveModal("checkin")}
              />
            )}

            {activeTab === "wallet" && (
              <WalletPage
                user={currentUser}
                withdrawals={withdrawals}
                transactions={transactions}
                onOpenWithdrawModal={() => setActiveModal("withdraw")}
              />
            )}

            {activeTab === "referrals" && (
              <ReferralsPage
                user={currentUser}
                referralsData={referralsData}
                onToast={addToast}
              />
            )}

            {activeTab === "profile" && (
              <ProfilePage
                user={currentUser}
                onNavigateTab={(tab) => setActiveTab(tab)}
              />
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 space-y-4">
            <div className="relative flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 p-0.5 shadow-xl shadow-indigo-500/30">
              <div className="w-full h-full bg-[#050508] rounded-[14px] flex items-center justify-center">
                <div className="w-7 h-7 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              </div>
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Starting EarnBirr...</h3>
              <p className="text-xs text-slate-400 mt-1">Authenticating your Telegram account</p>
            </div>
          </div>
        )}
      </main>

      <TaskVerificationModal
        task={activeModal === "task_verify" ? selectedTask : null}
        onClose={() => {
          setActiveModal(null);
          setSelectedTask(null);
        }}
        onComplete={handleCompleteTask}
      />

      <QuizModal
        task={activeModal === "quiz" ? selectedTask : null}
        onClose={() => {
          setActiveModal(null);
          setSelectedTask(null);
        }}
        onComplete={handleCompleteTask}
      />

      <DailyCheckInModal
        user={currentUser}
        isOpen={activeModal === "checkin"}
        onClose={() => setActiveModal(null)}
        onCheckIn={handleDailyCheckIn}
      />

      <WithdrawModal
        user={currentUser}
        isOpen={activeModal === "withdraw"}
        onClose={() => setActiveModal(null)}
        onSubmitWithdrawal={handleSubmitWithdrawal}
      />

      <Navbar
        activeTab={activeTab as TabType}
        onChangeTab={(tab) => setActiveTab(tab)}
        pendingTasksCount={
          tasks.filter((task) => !completedTaskIds.includes(task.id)).length
        }
      />
    </div>
  );
}