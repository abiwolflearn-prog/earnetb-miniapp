import React from 'react';
import { User } from '../types';
import { useTranslation } from '../i18n/useTranslation';
import { LanguageSelector } from './LanguageSelector';
import { Zap, Sparkles } from 'lucide-react';

interface HeaderProps {
  user: User | null;
  onNavigateProfile?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  onNavigateProfile
}) => {
  const { t } = useTranslation();

  return (
    <header className="sticky top-0 z-40 bg-[#0a0a0f]/95 backdrop-blur-xl border-b border-white/10 px-3 py-2.5 sm:px-4 sm:py-3">
      <div className="max-w-md mx-auto flex items-center justify-between gap-2">
        {/* Brand Logo */}
        <div className="flex items-center gap-2">
          <div className="relative flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 p-0.5 shadow-lg shadow-indigo-500/20 flex-shrink-0">
            <div className="w-full h-full bg-[#050508] rounded-[10px] flex items-center justify-center">
              <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400 fill-indigo-400/20" />
            </div>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm sm:text-base tracking-tight bg-gradient-to-r from-indigo-400 via-purple-300 to-purple-500 bg-clip-text text-transparent truncate">
                EarnBirr
              </span>
              <span className="px-1.5 py-0.2 text-[9px] sm:text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-md whitespace-nowrap">
                Mini App
              </span>
            </div>
            <p className="text-[9px] sm:text-[10px] text-slate-400 flex items-center gap-1 truncate">
              <Sparkles className="w-2.5 h-2.5 text-amber-400 flex-shrink-0" />
              <span>{t('header.subtitle')}</span>
            </p>
          </div>
        </div>

        {/* Header Action Shortcuts */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          {/* Global Language Selector Dropdown */}
          <LanguageSelector variant="dropdown" />

          {/* Real Telegram User Profile Badge */}
          <button
            onClick={onNavigateProfile}
            className="flex items-center gap-1.5 p-1 pl-1.5 pr-2 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 active:scale-95 transition-all"
            title="Profile"
          >
            <div className="relative flex-shrink-0">
              <img
                src={user?.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                alt={user?.firstName || 'User'}
                className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg object-cover ring-1 ring-purple-500/40"
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-500 border-2 border-[#0a0a0f] rounded-full" />
            </div>
            <div className="text-left hidden min-[360px]:block max-w-[70px] sm:max-w-[85px] truncate">
              <p className="text-[11px] font-bold text-slate-200 truncate leading-tight">
                {user?.firstName || 'User'}
              </p>
              <p className="text-[9px] font-semibold text-emerald-400 leading-none truncate">
                {user ? `${user.balance.toLocaleString()} ETB` : 'Verified'}
              </p>
            </div>
          </button>
        </div>
      </div>
    </header>
  );
};

