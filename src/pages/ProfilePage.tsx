import React from 'react';
import { User } from '../types';
import { User as UserIcon, ShieldCheck, Bot, Shield, ExternalLink, Flame, Trophy, Wallet, CheckCircle2, ChevronRight, MessageSquare } from 'lucide-react';

interface ProfilePageProps {
  user: User;
  onOpenAdmin: () => void;
  onOpenBotSandbox: () => void;
  onNavigateTab: (tab: 'tasks' | 'wallet' | 'referrals') => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  user,
  onOpenAdmin,
  onOpenBotSandbox,
  onNavigateTab
}) => {
  return (
    <div className="space-y-5 pb-24">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-black text-white">Profile & Settings</h2>
        <p className="text-xs text-slate-400">Manage your Telegram Mini App identity and security</p>
      </div>

      {/* User Overview Header Card */}
      <div className="p-6 rounded-3xl bg-[#0f0f15] border border-white/10 space-y-4 relative overflow-hidden shadow-xl">
        <div className="absolute -right-4 -top-4 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-center gap-4 relative z-10">
          <img
            src={user.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
            alt={user.firstName}
            className="w-16 h-16 rounded-2xl object-cover ring-2 ring-purple-500/50 shadow-lg"
          />
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-white">{user.firstName} {user.lastName || ''}</h3>
              <span className="p-1 rounded-full bg-emerald-500/20 text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
              </span>
            </div>
            <p className="text-xs text-indigo-400 font-mono">@{user.username || `user_${user.telegramId}`}</p>
            <p className="text-[11px] text-slate-400">Telegram ID: <code className="text-slate-300">{user.telegramId}</code></p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-3 border-t border-white/10 text-xs relative z-10">
          <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
            <span className="text-slate-400 text-[10px] block uppercase tracking-wider">Joined Date</span>
            <span className="font-semibold text-white">{new Date(user.createdAt).toLocaleDateString()}</span>
          </div>
          <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
            <span className="text-slate-400 text-[10px] block uppercase tracking-wider">Account Status</span>
            <span className="font-semibold text-emerald-400">Active & Verified</span>
          </div>
        </div>
      </div>

      {/* Total Earnings Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div
          onClick={() => onNavigateTab('wallet')}
          className="p-5 rounded-3xl bg-[#0f0f15] border border-white/5 space-y-1 cursor-pointer hover:border-white/20 transition-all"
        >
          <span className="text-xs text-slate-400 font-medium">Total Cash Balance</span>
          <p className="text-2xl font-black text-amber-400">{user.balance.toLocaleString()} Birr</p>
          <span className="text-[10px] text-indigo-400 flex items-center gap-1 font-semibold">
            Tap to view wallet <ChevronRight className="w-3 h-3" />
          </span>
        </div>

        <div
          onClick={() => onNavigateTab('referrals')}
          className="p-5 rounded-3xl bg-[#0f0f15] border border-white/5 space-y-1 cursor-pointer hover:border-white/20 transition-all"
        >
          <span className="text-xs text-slate-400 font-medium">Referrals Bonus</span>
          <p className="text-2xl font-black text-purple-400">{user.referralsCount * 50} Birr</p>
          <span className="text-[10px] text-purple-300 flex items-center gap-1 font-semibold">
            {user.referralsCount} friends invited <ChevronRight className="w-3 h-3" />
          </span>
        </div>
      </div>

      {/* Shortcuts & Utilities */}
      <div className="space-y-2">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Quick Utilities</h4>

        <div className="space-y-2">
          <button
            onClick={onOpenBotSandbox}
            className="w-full p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-between text-left transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Telegram Bot Commands Sandbox</p>
                <p className="text-[11px] text-slate-400">Simulate /start, /help, /tasks bot responses</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-500" />
          </button>

          <button
            onClick={onOpenAdmin}
            className="w-full p-4 rounded-2xl bg-purple-950/40 hover:bg-purple-900/40 border border-purple-500/30 flex items-center justify-between text-left transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-purple-200">Admin Panel Access</p>
                <p className="text-[11px] text-purple-300/70">Manage users, approve withdrawals, create tasks</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-purple-400" />
          </button>

          <a
            href="https://t.me/NovaTaskOfficial"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-between text-left transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Official Telegram Channel</p>
                <p className="text-[11px] text-slate-400">@NovaTaskOfficial channel updates</p>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-slate-500" />
          </a>
        </div>
      </div>
    </div>
  );
};
