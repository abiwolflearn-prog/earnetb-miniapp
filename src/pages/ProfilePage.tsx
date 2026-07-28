import React from 'react';
import { User } from '../types';
import { useTranslation } from '../i18n/useTranslation';
import { LanguageSelector } from '../components/LanguageSelector';
import { Shield, Bot, ExternalLink, CheckCircle2, ChevronRight, MessageSquare, Globe } from 'lucide-react';

interface ProfilePageProps {
  user: User;
  onOpenBotSandbox: () => void;
  onNavigateTab: (tab: 'tasks' | 'wallet' | 'referrals') => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  user,
  onOpenBotSandbox,
  onNavigateTab
}) => {
  const { t, formatCurrency, formatDate } = useTranslation();

  return (
    <div className="space-y-5 pb-24">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-black text-white">{t('profile.title')}</h2>
        <p className="text-xs text-slate-400">{t('profile.subtitle')}</p>
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
            <p className="text-[11px] text-slate-400">{t('home.tg_id')}: <code className="text-slate-300">{user.telegramId}</code></p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-3 border-t border-white/10 text-xs relative z-10">
          <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
            <span className="text-slate-400 text-[10px] block uppercase tracking-wider">{t('profile.joined_date')}</span>
            <span className="font-semibold text-white">{formatDate(user.createdAt)}</span>
          </div>
          <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
            <span className="text-slate-400 text-[10px] block uppercase tracking-wider">{t('profile.account_status')}</span>
            <span className="font-semibold text-emerald-400">{t('profile.active_verified')}</span>
          </div>
        </div>
      </div>

      {/* Language Preference Section */}
      <div className="p-5 rounded-3xl bg-[#0f0f15] border border-white/10 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-indigo-400" />
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">{t('profile.language_setting')}</h4>
          </div>
          <span className="text-[10px] text-slate-400">{t('profile.instant_switch')}</span>
        </div>
        <div className="pt-1">
          <LanguageSelector variant="pill" />
        </div>
      </div>

      {/* Total Earnings Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div
          onClick={() => onNavigateTab('wallet')}
          className="p-5 rounded-3xl bg-[#0f0f15] border border-white/5 space-y-1 cursor-pointer hover:border-white/20 transition-all"
        >
          <span className="text-xs text-slate-400 font-medium">{t('profile.total_cash_balance')}</span>
          <p className="text-2xl font-black text-amber-400">{formatCurrency(user.balance)}</p>
          <span className="text-[10px] text-indigo-400 flex items-center gap-1 font-semibold">
            {t('profile.view_wallet')} <ChevronRight className="w-3 h-3" />
          </span>
        </div>

        <div
          onClick={() => onNavigateTab('referrals')}
          className="p-5 rounded-3xl bg-[#0f0f15] border border-white/5 space-y-1 cursor-pointer hover:border-white/20 transition-all"
        >
          <span className="text-xs text-slate-400 font-medium">{t('profile.referrals_bonus')}</span>
          <p className="text-2xl font-black text-purple-400">{formatCurrency(user.referralsCount * 50)}</p>
          <span className="text-[10px] text-purple-300 flex items-center gap-1 font-semibold">
            {t('referrals.friends_count', { count: user.referralsCount })} <ChevronRight className="w-3 h-3" />
          </span>
        </div>
      </div>

      {/* Shortcuts & Utilities */}
      <div className="space-y-2">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('profile.quick_utilities')}</h4>

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
                <p className="text-xs font-bold text-white">{t('profile.bot_sandbox_title')}</p>
                <p className="text-[11px] text-slate-400">{t('profile.bot_sandbox_desc')}</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-500" />
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
                <p className="text-xs font-bold text-white">{t('profile.telegram_channel_title')}</p>
                <p className="text-[11px] text-slate-400">{t('profile.telegram_channel_desc')}</p>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-slate-500" />
          </a>
        </div>
      </div>
    </div>
  );
};

