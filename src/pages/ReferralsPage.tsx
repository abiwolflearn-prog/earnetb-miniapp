import React, { useState } from 'react';
import { User } from '../types';
import { triggerHaptic, openExternalLink } from '../lib/telegram';
import { Users, Copy, Share2, Check, Trophy, Sparkles, Gift, ArrowRight } from 'lucide-react';

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
  const [copied, setCopied] = useState(false);

  const botUsername = 'EtNovaTasksbot';
  const referralLink = `https://t.me/${botUsername}/app?startapp=${user.referralCode}`;

  const handleCopyLink = () => {
    triggerHaptic('light');
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    onShowToast('Referral Link Copied!', 'Share it with friends to earn 50 Birr per referral.', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareOnTelegram = () => {
    triggerHaptic('medium');
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent('Join NovaTask Telegram Mini App and earn Telebirr cash rewards by completing daily tasks!')}`;
    openExternalLink(shareUrl);
  };

  return (
    <div className="space-y-5 pb-24">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-black text-white">Invite & Earn Program</h2>
        <p className="text-xs text-slate-400">Earn 50 Birr + 500 PTS for every friend who joins via your link</p>
      </div>

      {/* Main Invite Card */}
      <div className="p-6 rounded-3xl bg-[#0f0f15] border border-white/10 space-y-4 shadow-xl relative overflow-hidden">
        <div className="absolute -right-4 -top-4 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/40 text-purple-300 flex items-center justify-center">
            <Gift className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Invite Friends & Earn</h3>
            <p className="text-xs text-purple-200">Unlimited referral commission</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/10 relative z-10">
          <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
            <span className="text-[11px] text-slate-400 block">Invited Friends</span>
            <span className="text-xl font-bold text-white">{referralsData.referralsCount}</span>
          </div>
          <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
            <span className="text-[11px] text-slate-400 block">Total Referral Earnings</span>
            <span className="text-xl font-bold text-amber-400">{referralsData.totalEarnedBirr} Birr</span>
          </div>
        </div>

        {/* Referral Link Box */}
        <div className="space-y-1.5 pt-2 relative z-10">
          <label className="text-xs font-semibold text-slate-300">Your Unique Telegram Referral Link</label>
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
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        <button
          onClick={handleShareOnTelegram}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:brightness-110 font-extrabold text-white text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25 transition-all relative z-10"
        >
          <Share2 className="w-4 h-4" />
          <span>Share Referral Link on Telegram</span>
        </button>
      </div>

      {/* Referral Leaderboard */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>Top Referrers Leaderboard</span>
          </h3>
          <span className="text-xs text-slate-400">Live Rankings</span>
        </div>

        <div className="space-y-2">
          {referralsData.leaderboard.map((leader) => (
            <div
              key={leader.rank}
              className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
                leader.rank === 1
                  ? 'bg-amber-500/10 border-amber-500/30'
                  : 'bg-white/5 border-white/10'
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`w-7 h-7 rounded-xl text-xs font-black flex items-center justify-center ${
                    leader.rank === 1
                      ? 'bg-amber-500 text-slate-950'
                      : leader.rank === 2
                      ? 'bg-slate-300 text-slate-950'
                      : 'bg-white/10 text-slate-300'
                  }`}
                >
                  #{leader.rank}
                </span>
                <div>
                  <p className="text-xs font-bold text-white">{leader.firstName}</p>
                  <p className="text-[10px] text-slate-400">@{leader.username || `user_${leader.rank}`}</p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs font-extrabold text-amber-400 block">{leader.totalEarnedBirr} Birr</span>
                <span className="text-[10px] text-slate-400">{leader.referralsCount} friends</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Invited Friends List */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-white">Invited Friends ({referralsData.friends.length})</h3>

        <div className="space-y-2">
          {referralsData.friends.map((friend, idx) => (
            <div key={idx} className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-white">{friend.firstName}</p>
                <p className="text-[10px] text-slate-400">Joined {new Date(friend.joinedAt).toLocaleDateString()}</p>
              </div>
              <span className="text-xs font-extrabold text-emerald-400">+50 Birr</span>
            </div>
          ))}

          {referralsData.friends.length === 0 && (
            <div className="p-8 rounded-3xl bg-[#0f0f15] border border-white/5 text-center text-slate-400 text-xs space-y-1">
              <Users className="w-8 h-8 text-indigo-400/50 mx-auto" />
              <p className="font-semibold text-white">No Friends Invited Yet</p>
              <p className="text-slate-400">Share your referral link on Telegram groups to earn 50 Birr per friend!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
