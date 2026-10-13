/**
 * EarnBirr - Telegram Mini App Platform
 * Main App Component - Instant Launch with Real Telegram Account
 */

import React, { useEffect, useState } from "react";
import { User, Task, Withdrawal, Transaction } from "./types";
import {
  getTelegramInitData,
  getRealOrPersistentUser,
  getTelegramWebApp,
} from "./lib/telegram";
import { safeFetchJson } from "./lib/api";
import { INITIAL_TASKS } from "./data/initialTasks";

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

  // Instant zero-millisecond start: Initialize currentUser synchronously from Telegram WebApp
  const [currentUser, setCurrentUser] = useState<User>(() => {
    const tgUser = getRealOrPersistentUser();
    return {
      id: `usr_${tgUser.id}`,
      telegramId: tgUser.id,
      username: tgUser.username || `user_${tgUser.id}`,
      firstName: tgUser.first_name || "Member",
      lastName: tgUser.last_name || "",
      photoUrl: tgUser.photo_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      balance: 100,
      points: 1000,
      referralsCount: 0,
      referralCode: `ref_${tgUser.id}`,
      dailyStreak: 1,
      isBlocked: false,
      role: "user",
      ipAddresses: [],
      lastIp: "",
      riskScore: 0,
      fraudFlags: [],
      createdAt: new Date().toISOString(),
    };
  });

  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [completedTaskIds, setCompletedTaskIds] = useState<string[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [referralsData, setReferralsData] = useState({
    referralCode: `ref_${getRealOrPersistentUser().id}`,
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

  // Background silent sync with backend: updates profile and task records without blocking the user
  const syncUserData = async () => {
    try {
      const initDataRaw = getTelegramInitData();
      const tgUser = getRealOrPersistentUser();
      const tg = getTelegramWebApp();
      const urlParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
      const referredByCode = tg?.initDataUnsafe?.start_param || urlParams?.get("startapp") || urlParams?.get("ref") || undefined;

      // Safe JSON authentication
      const authResult = await safeFetchJson<{
        user: User;
        completedTaskIds: string[];
        submissions: any[];
      }>("/api/auth/telegram", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          initDataRaw,
          referredByCode,
          user: tgUser,
        }),
      });

      if (authResult.ok && authResult.data?.user) {
        setCurrentUser(authResult.data.user);
        setCompletedTaskIds(authResult.data.completedTaskIds || []);
      }

      // Safe tasks fetch
      const tasksResult = await safeFetchJson<{ tasks: Task[] }>("/api/tasks", {
        headers: {
          "x-telegram-init-data": initDataRaw,
        },
      });

      if (tasksResult.ok && tasksResult.data?.tasks && tasksResult.data.tasks.length > 0) {
        setTasks(tasksResult.data.tasks);
      }

      // Safe withdrawals & transactions fetch
      const withdrawalsResult = await safeFetchJson<{
        withdrawals: Withdrawal[];
        transactions: Transaction[];
      }>("/api/withdrawals", {
        headers: {
          "x-telegram-init-data": initDataRaw,
        },
      });

      if (withdrawalsResult.ok && withdrawalsResult.data) {
        if (withdrawalsResult.data.withdrawals) {
          setWithdrawals(withdrawalsResult.data.withdrawals);
        }
        if (withdrawalsResult.data.transactions) {
          setTransactions(withdrawalsResult.data.transactions);
        }
      }

      // Safe referrals info fetch
      const refResult = await safeFetchJson("/api/referrals", {
        headers: {
          "x-telegram-init-data": initDataRaw,
        },
      });

      if (refResult.ok && refResult.data?.referralCode) {
        setReferralsData(refResult.data);
      }
    } catch (error: any) {
      console.warn("Background sync info:", error);
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

      const res = await safeFetchJson<{ rewardBirr?: number; rewardPoints?: number }>(
        "/api/tasks/complete",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-telegram-init-data": initDataRaw,
          },
          body: JSON.stringify({
            taskId,
            quizAnswers,
          }),
        }
      );

      if (!res.ok) {
        throw new Error(res.error || "Failed to complete task");
      }

      const rewardBirr = res.data?.rewardBirr ?? 50;
      const rewardPoints = res.data?.rewardPoints ?? 500;

      addToast(
        "Reward Earned!",
        `+${rewardBirr} Birr & +${rewardPoints} Points added to your balance!`,
        "success"
      );

      // Optimistic balance update
      setCurrentUser((prev) => ({
        ...prev,
        balance: prev.balance + rewardBirr,
        points: prev.points + rewardPoints,
      }));
      setCompletedTaskIds((prev) => [...prev, taskId]);

      setActiveModal(null);
      setSelectedTask(null);
      syncUserData();
    } catch (error: any) {
      addToast("Verification Notice", error.message, "error");
    }
  };

  // Daily Check-in
  const handleDailyCheckIn = async () => {
    try {
      const initDataRaw = getTelegramInitData();

      const res = await safeFetchJson<{ rewardBirr?: number; user?: User }>(
        "/api/user/checkin",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-telegram-init-data": initDataRaw,
          },
        }
      );

      if (!res.ok) {
        throw new Error(res.error || "Daily check-in already claimed for today");
      }

      const rewardBirr = res.data?.rewardBirr ?? 25;
      const streak = res.data?.user?.dailyStreak ?? currentUser.dailyStreak + 1;

      addToast(
        "Daily Streak Claimed!",
        `+${rewardBirr} Birr added for Day ${streak}!`,
        "success"
      );

      setCurrentUser((prev) => ({
        ...prev,
        balance: prev.balance + rewardBirr,
        dailyStreak: streak,
        lastCheckIn: new Date().toISOString(),
      }));

      setActiveModal(null);
      syncUserData();
    } catch (error: any) {
      addToast("Check-in Notice", error.message, "info");
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

      const res = await safeFetchJson<{ withdrawal?: Withdrawal; user?: User }>(
        "/api/withdrawals",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-telegram-init-data": initDataRaw,
          },
          body: JSON.stringify(wthInput),
        }
      );

      if (!res.ok) {
        throw new Error(res.error || "Withdrawal failed");
      }

      addToast(
        "Cashout Request Logged",
        `${wthInput.amount} Birr via ${wthInput.method.toUpperCase()} submitted for admin processing`,
        "success"
      );

      if (res.data?.user) {
        setCurrentUser(res.data.user);
      } else {
        setCurrentUser((prev) => ({
          ...prev,
          balance: Math.max(0, prev.balance - wthInput.amount),
        }));
      }

      setActiveModal(null);
      syncUserData();
    } catch (error: any) {
      addToast("Withdrawal Notice", error.message, "error");
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