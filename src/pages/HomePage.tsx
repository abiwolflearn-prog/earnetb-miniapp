import React from 'react';
import { User, Task } from '../types';
import { Wallet, CheckCircle2, Flame, Users, ArrowUpRight, Zap, Gift, Trophy, Sparkles, ChevronRight, ArrowRight } from 'lucide-react';

interface HomePageProps {
  user: User;
  tasks: Task[];
  completedTaskIds: string[];
  onNavigateTab: (tab: 'tasks' | 'wallet' | 'referrals' | 'profile') => void;
  onOpenCheckIn: () => void;
  onOpenTaskModal: (task: Task) => void;
  onOpenWithdrawModal: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  user,
  tasks,
  completedTaskIds,
  onNavigateTab,
  onOpenCheckIn,
  onOpenTaskModal,
  onOpenWithdrawModal
}) => {
  const activeTasks = tasks.filter((t) => t.status === 'active');
  const availableTasks = activeTasks.filter((t) => !completedTaskIds.includes(t.id));

  const withdrawalProgressPercent = Math.min(100, Math.round((user.balance / 2000) * 100));

  const todayStr = new Date().toISOString().split('T')[0];
  const lastCheckInStr = user.lastCheckIn ? user.lastCheckIn.split('T')[0] : null;
  const isCheckedInToday = lastCheckInStr === todayStr;

  return (
    <div className="space-y-5 pb-24">
      {/* Balance Card */}
      <div className="relative overflow-hidden rounded-3xl bg-[#0f0f15] border border-white/10 p-6 shadow-2xl">
        <div className="absolute -right-4 -top-4 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -left-4 -bottom-4 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-semibold flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 fill-indigo-400/20" /> Active Balance
              </span>
            </div>
            <span className="text-xs text-slate-400 font-mono">TG ID: {user.telegramId}</span>
          </div>

          <div>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Total Balance</p>
            <div className="flex items-baseline gap-2 mt-1">
              <h2 className="text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-300 to-purple-500">
                {user.balance.toLocaleString()}{' '}
                <span className="text-xl font-bold text-amber-400">Birr</span>
              </h2>
            </div>
            <p className="text-xs text-indigo-400 font-medium mt-1 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" /> {user.points.toLocaleString()} Points Wallet
            </p>
          </div>

          {/* Withdrawal Progress Bar */}
          <div className="space-y-1.5 pt-2 border-t border-white/10">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Min. Cashout Progress</span>
              <span className="font-bold text-white">{withdrawalProgressPercent}% ({user.balance} / 2,000 Birr)</span>
            </div>
            <div className="w-full h-2 bg-[#050508] rounded-full overflow-hidden border border-white/10">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 transition-all duration-500"
                style={{ width: `${withdrawalProgressPercent}%` }}
              />
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => onNavigateTab('tasks')}
              className="py-3.5 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:brightness-110 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25 transition-all active:scale-[0.98]"
            >
              <Zap className="w-4 h-4 fill-white" />
              <span>Earn Rewards</span>
            </button>
            <button
              onClick={onOpenWithdrawModal}
              className="py-3.5 px-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white border border-white/10 font-extrabold text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              <Wallet className="w-4 h-4 text-amber-400" />
              <span>Cash Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-3xl bg-[#0f0f15] border border-white/5 space-y-1 relative overflow-hidden">
          <div className="absolute -right-2 -top-2 w-16 h-16 bg-indigo-500/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs font-medium">Tasks Done</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white">{completedTaskIds.length}</p>
        </div>

        <div className="p-4 rounded-3xl bg-[#0f0f15] border border-white/5 space-y-1 relative overflow-hidden">
          <div className="absolute -right-2 -top-2 w-16 h-16 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs font-medium">Daily Streak</span>
            <Flame className="w-4 h-4 text-amber-400 fill-amber-400/20" />
          </div>
          <p className="text-2xl font-bold text-white">{user.dailyStreak} Days</p>
        </div>

        <div className="p-4 rounded-3xl bg-[#0f0f15] border border-white/5 space-y-1 relative overflow-hidden">
          <div className="absolute -right-2 -top-2 w-16 h-16 bg-purple-500/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs font-medium">Friends Invited</span>
            <Users className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-white">{user.referralsCount}</p>
        </div>

        <div className="p-4 rounded-3xl bg-[#0f0f15] border border-white/5 space-y-1 relative overflow-hidden">
          <div className="absolute -right-2 -top-2 w-16 h-16 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs font-medium">Referral Bonus</span>
            <Trophy className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-bold text-amber-400">{user.referralsCount * 50} Birr</p>
        </div>
      </div>

      {/* Daily Check-In Banner */}
      <div className="p-4 rounded-3xl bg-[#0f0f15] border border-white/10 flex items-center justify-between shadow-lg relative overflow-hidden">
        <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center">
            <Gift className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">Daily Attendance Bonus</h4>
            <p className="text-xs text-slate-400">
              {isCheckedInToday ? 'Checked in for today!' : 'Claim your daily attendance reward'}
            </p>
          </div>
        </div>

        <button
          onClick={onOpenCheckIn}
          className={`relative z-10 py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${
            isCheckedInToday
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:brightness-110 text-white shadow-md shadow-indigo-500/20'
          }`}
        >
          {isCheckedInToday ? 'Claimed' : 'Check In'}
        </button>
      </div>

      {/* Top Available Tasks */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white">Top Available Tasks</h3>
            <p className="text-xs text-slate-400">Complete verified tasks to earn Birr instantly</p>
          </div>
          <button
            onClick={() => onNavigateTab('tasks')}
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
          >
            <span>View All ({availableTasks.length})</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2.5">
          {availableTasks.slice(0, 4).map((task) => (
            <div
              key={task.id}
              onClick={() => onOpenTaskModal(task)}
              className="bg-white/5 border border-white/10 p-4 rounded-2xl flex items-center justify-between gap-3 hover:bg-white/[0.08] transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                  <Zap className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-extrabold px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">
                      {task.category}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-white truncate mt-0.5">{task.title}</h4>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="text-right">
                  <span className="text-sm font-extrabold text-indigo-400 block">+{task.rewardBirr} Birr</span>
                  <span className="text-[10px] text-slate-500">+{task.rewardPoints} PTS</span>
                </div>
                <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-colors">
                  Start
                </button>
              </div>
            </div>
          ))}

          {availableTasks.length === 0 && (
            <div className="p-8 rounded-3xl bg-[#0f0f15] border border-white/5 text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
              <p className="text-sm font-semibold text-white">All Available Tasks Completed!</p>
              <p className="text-xs text-slate-400">Check back later or invite friends to earn referral bonuses.</p>
            </div>
          )}
        </div>
      </div>

      {/* Community Live Activity Feed */}
      <div className="p-5 rounded-3xl bg-[#0f0f15] border border-white/5 space-y-3">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>Live Platform Activity</span>
        </h4>
        <div className="space-y-2 text-xs">
          <div className="p-3 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between text-slate-200">
            <span>Abebe B. withdrew <strong className="text-emerald-400">2,500 Birr</strong> via Telebirr</span>
            <span className="text-[10px] text-slate-500">2 mins ago</span>
          </div>
          <div className="p-3 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between text-slate-200">
            <span>Selam T. earned <strong className="text-indigo-400">+250 Birr</strong> on Ethiopia Fintech Quiz</span>
            <span className="text-[10px] text-slate-500">5 mins ago</span>
          </div>
          <div className="p-3 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between text-slate-200">
            <span>Dawit G. invited <strong className="text-purple-400">3 new friends</strong> (+150 Birr)</span>
            <span className="text-[10px] text-slate-500">12 mins ago</span>
          </div>
        </div>
      </div>
    </div>
  );
};
