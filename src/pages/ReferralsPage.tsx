import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { triggerHaptic, openExternalLink } from '../lib/telegram';
import { useTranslation } from '../i18n/useTranslation';
import { Users, Copy, Share2, Check, Trophy, Gift } from 'lucide-react';
import { LeaderboardPodium, LeaderboardUser } from '../components/LeaderboardPodium';

interface ReferralsPageProps {
  user: User;
  referralsData: {
    referralCode: string;
    referralsCount: number;
    totalEarnedBirr: number;
    friends: Array<{
      telegramId: number;
      firstName: string;
      username?: string;
      joinedAt: string;
      earnedForUserBirr: number;
    }>;
    leaderboard: Array<{
      rank: number;
      firstName: string;
      username?: string;
      photoUrl?: string;
      referralsCount: number;
      totalEarnedBirr: number;
    }>;
  };
  onShowToast: (title: string, message?: string, type?: 'success' | 'error' | 'info') => void;
}

export const ReferralsPage: React.FC<ReferralsPageProps> = ({
  user,
  referralsData,
  onShowToast
}) => {
  const { t, formatCurrency } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [podiumData, setPodiumData] = useState<{
    top3: { rank1: LeaderboardUser | null; rank2: LeaderboardUser | null; rank3: LeaderboardUser | null };
    leaderboard: LeaderboardUser[];
  }>({
    top3: { rank1: null, rank2: null, rank3: null },
    leaderboard: []
  });

  useEffect(() => {
    fetch('/api/leaderboard')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.top3) {
          setPodiumData({
            top3: data.top3,
            leaderboard: data.leaderboard || []
          });
        }
      })
      .catch((err) => console.error('Leaderboard error:', err));
  }, []);

  const botUsername = 'EtNovaTasksbot';
  const referralLink = `https://t.me/${botUsername}/app?startapp=${user.referralCode}`;

  const handleCopyLink = () => {
    triggerHaptic('light');
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    onShowToast(t('referrals.copied_toast_title'), t('referrals.copied_toast_desc'), 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareOnTelegram = () => {
    triggerHaptic('medium');
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(t('referrals.share_text'))}`;
    openExternalLink(shareUrl);
  };

  return (
    <div className="space-y-5 pb-24">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-black text-white">{t('referrals.title')}</h2>
        <p className="text-xs text-slate-400">{t('referrals.subtitle')}</p>
      </div>

      {/* Main Invite Card */}
      <div className="p-6 rounded-3xl bg-[#0f0f15] border border-white/10 space-y-4 shadow-xl relative overflow-hidden">
        <div className="absolute -right-4 -top-4 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/40 text-purple-300 flex items-center justify-center">
            <Gift className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">{t('referrals.invite_friends')}</h3>
            <p className="text-xs text-purple-200">{t('referrals.unlimited_commission')}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/10 relative z-10">
          <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
            <span className="text-[11px] text-slate-400 block">{t('referrals.invited_friends')}</span>
            <span className="text-xl font-bold text-white">{referralsData.referralsCount}</span>
          </div>
          <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
            <span className="text-[11px] text-slate-400 block">{t('referrals.total_referral_earnings')}</span>
            <span className="text-xl font-bold text-amber-400">{formatCurrency(referralsData.totalEarnedBirr)}</span>
          </div>
        </div>

        {/* Referral Link Box */}
        <div className="space-y-1.5 pt-2 relative z-10">
          <label className="text-xs font-semibold text-slate-300">{t('referrals.your_link')}</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={referralLink}
              className="flex-1 bg-[#050508] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-indigo-300 font-mono focus:outline-none"
            />
            <button
              onClick={handleCopyLink}
              className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold flex items-center gap-1.5 transition-colors border border-white/10"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? t('referrals.copied') : t('referrals.copy')}</span>
            </button>
          </div>
        </div>

        <button
          onClick={handleShareOnTelegram}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:brightness-110 font-extrabold text-white text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25 transition-all relative z-10"
        >
          <Share2 className="w-4 h-4" />
          <span>{t('referrals.share_on_telegram')}</span>
        </button>
      </div>

      {/* TOP PODIUM LEADERBOARD */}
      <div className="p-4 rounded-3xl bg-[#0d0d14] border border-white/10 shadow-2xl">
        <LeaderboardPodium
          top3={podiumData.top3}
          leaderboard={podiumData.leaderboard}
        />
      </div>

      {/* Invited Friends List */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-white">{t('referrals.invited_friends_count', { count: referralsData.friends.length })}</h3>

        <div className="space-y-2">
          {referralsData.friends.map((friend, idx) => (
            <div key={idx} className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-white">{friend.firstName}</p>
                <p className="text-[10px] text-slate-400">{t('referrals.joined_date', { date: new Date(friend.joinedAt).toLocaleDateString() })}</p>
              </div>
              <span className="text-xs font-extrabold text-emerald-400">+{formatCurrency(50)}</span>
            </div>
          ))}

          {referralsData.friends.length === 0 && (
            <div className="p-8 rounded-3xl bg-[#0f0f15] border border-white/5 text-center text-slate-400 text-xs space-y-1">
              <Users className="w-8 h-8 text-indigo-400/50 mx-auto" />
              <p className="font-semibold text-white">{t('referrals.no_friends')}</p>
              <p className="text-slate-400">{t('referrals.no_friends_desc')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

