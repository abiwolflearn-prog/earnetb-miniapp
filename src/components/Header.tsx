import React, { useState } from 'react';
import { User } from '../types';
import { MOCK_TELEGRAM_USERS, getTelegramWebApp } from '../lib/telegram';
import { Shield, Bot, Users, ChevronDown, Check, Zap, Sparkles } from 'lucide-react';

interface HeaderProps {
  user: User | null;
  onSelectSimulatedUser: (tgUser: typeof MOCK_TELEGRAM_USERS[0]) => void;
  onOpenAdmin: () => void;
  onOpenBotSandbox: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  onSelectSimulatedUser,
  onOpenAdmin,
  onOpenBotSandbox
}) => {
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const isTgWebApp = Boolean(getTelegramWebApp()?.initData);

  return (
    <header className="sticky top-0 z-40 bg-[#0a0a0f]/90 backdrop-blur-xl border-b border-white/10 px-4 py-3">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 p-0.5 shadow-lg shadow-indigo-500/20">
            <div className="w-full h-full bg-[#050508] rounded-[10px] flex items-center justify-center">
              <Zap className="w-5 h-5 text-indigo-400 fill-indigo-400/20" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-indigo-400 via-purple-300 to-purple-500 bg-clip-text text-transparent">
                NovaTask
              </span>
              <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-md">
                Mini App
              </span>
            </div>
            <p className="text-[10px] text-slate-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" /> Telegram Task Rewards
            </p>
          </div>
        </div>

        {/* Header Action Shortcuts */}
        <div className="flex items-center gap-2">
          {/* Bot Sandbox Button */}
          <button
            onClick={onOpenBotSandbox}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#0f0f15] hover:bg-white/10 border border-white/10 text-slate-300 hover:text-indigo-400 text-xs font-medium transition-all shadow-sm"
            title="Open Telegram Bot Command Simulator"
          >
            <Bot className="w-4 h-4 text-indigo-400" />
            <span className="hidden sm:inline">Bot Simulator</span>
          </button>

          {/* Admin Dashboard Button */}
          <button
            onClick={onOpenAdmin}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-purple-950/40 hover:bg-purple-900/60 border border-purple-500/30 text-purple-200 hover:text-purple-100 text-xs font-medium transition-all shadow-sm"
            title="Open Admin Panel"
          >
            <Shield className="w-4 h-4 text-purple-400" />
            <span className="hidden sm:inline">Admin</span>
          </button>

          {/* Telegram User Switcher / Profile Badge */}
          <div className="relative">
            <button
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="flex items-center gap-2 p-1 pl-2 pr-1.5 rounded-xl bg-[#0f0f15] border border-white/10 hover:border-white/20 transition-all"
            >
              <img
                src={user?.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                alt={user?.firstName || 'User'}
                className="w-6 h-6 rounded-lg object-cover ring-1 ring-purple-500/40"
              />
              <span className="text-xs font-medium text-slate-200 max-w-[80px] truncate">
                {user?.firstName || 'Abebe'}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {/* Simulated User Selector Modal/Dropdown */}
            {showUserDropdown && (
              <div className="absolute right-0 mt-2 w-64 bg-[#0f0f15] border border-white/10 rounded-2xl shadow-2xl p-2 z-50">
                <div className="px-3 py-2 border-b border-white/10 mb-1">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Telegram Test User</span>
                    {isTgWebApp ? (
                      <span className="text-emerald-400 text-[10px] lowercase">connected</span>
                    ) : (
                      <span className="text-amber-400 text-[10px] lowercase">simulated</span>
                    )}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Switch user to test referrals & rewards</p>
                </div>

                <div className="space-y-1">
                  {MOCK_TELEGRAM_USERS.map((mockTg) => (
                    <button
                      key={mockTg.id}
                      onClick={() => {
                        onSelectSimulatedUser(mockTg);
                        setShowUserDropdown(false);
                      }}
                      className={`w-full flex items-center justify-between p-2 rounded-xl text-left text-xs transition-colors ${
                        user?.telegramId === mockTg.id
                          ? 'bg-indigo-500/20 text-indigo-200 border border-indigo-500/30 font-medium'
                          : 'hover:bg-white/5 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <img
                          src={mockTg.photo_url}
                          alt={mockTg.first_name}
                          className="w-7 h-7 rounded-lg object-cover"
                        />
                        <div>
                          <p className="font-medium text-slate-200">{mockTg.first_name} {mockTg.last_name}</p>
                          <p className="text-[10px] text-slate-400">@{mockTg.username}</p>
                        </div>
                      </div>
                      {user?.telegramId === mockTg.id && (
                        <Check className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
