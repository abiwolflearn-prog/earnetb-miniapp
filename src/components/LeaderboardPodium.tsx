import React from 'react';
import { Crown, Trophy, Award, Users, TrendingUp, Sparkles, ShieldCheck } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';

export interface LeaderboardUser {
  rank: number;
  rawName: string;
  maskedName: string;
  rawUsername: string;
  maskedUsername: string;
  photoUrl: string;
  referralsCount: number;
  totalEarnedBirr: number;
  isSampleData?: boolean;
}

interface LeaderboardPodiumProps {
  top3: {
    rank1: LeaderboardUser | null;
    rank2: LeaderboardUser | null;
    rank3: LeaderboardUser | null;
  };
  leaderboard: LeaderboardUser[];
  currentUserId?: string;
  userRank?: number;
}

export const LeaderboardPodium: React.FC<LeaderboardPodiumProps> = ({
  top3,
  leaderboard,
  userRank
}) => {
  const { t, formatCurrency } = useTranslation();

  const rank1 = top3.rank1;
  const rank2 = top3.rank2;
  const rank3 = top3.rank3;

  const restRankings = leaderboard.filter((u) => u.rank > 3);

  return (
    <div className="space-y-6">
      {/* Top Section Header */}
      <div className="text-center space-y-1">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-widest shadow-lg shadow-amber-500/10">
          <Trophy className="w-3.5 h-3.5 text-amber-400" />
          <span>{t('leaderboard_view.title')}</span>
        </div>
        <p className="text-xs text-slate-400">{t('leaderboard_view.subtitle')}</p>
      </div>

      {/* TOP 3 PODIUM LAYOUT */}
      {/*
          🥇 #1 User (Centered at top)
      🥈 #2 User         🥉 #3 User (Flanking left & right)
      */}
      <div className="relative pt-6 pb-2">
        <div className="grid grid-cols-3 gap-2 items-end max-w-sm mx-auto">
          {/* POSITION #2 - LEFT (Silver) */}
          <div className="flex flex-col items-center text-center">
            {rank2 ? (
              <div className="w-full bg-[#12121c] border border-slate-500/30 rounded-2xl p-3 flex flex-col items-center relative shadow-lg shadow-slate-900/40">
                <div className="absolute -top-3.5 px-2 py-0.5 rounded-full bg-slate-700 text-slate-200 border border-slate-400/40 text-[10px] font-black flex items-center gap-0.5">
                  🥈 #2
                </div>

                <div className="relative mt-2 mb-2">
                  <img
                    src={rank2.photoUrl}
                    alt={rank2.maskedName}
                    className="w-12 h-12 rounded-full object-cover border-2 border-slate-400 shadow-md"
                  />
                  <div className="absolute -bottom-1 -right-1 bg-slate-800 text-slate-200 rounded-full p-0.5 border border-slate-400">
                    <Award className="w-3 h-3" />
                  </div>
                </div>

                <p className="text-xs font-black text-white truncate max-w-[85px]">
                  {rank2.maskedName}
                </p>
                <p className="text-[10px] text-slate-400 truncate max-w-[85px]">
                  {rank2.maskedUsername}
                </p>

                <div className="mt-2 w-full pt-1.5 border-t border-white/5 space-y-0.5">
                  <span className="text-[10px] text-purple-400 font-bold flex items-center justify-center gap-1">
                    <Users className="w-2.5 h-2.5" />
                    {rank2.referralsCount} {t('referrals.friends_count', { count: '' }).trim()}
                  </span>
                  <p className="text-[11px] font-extrabold text-amber-400">
                    {formatCurrency(rank2.totalEarnedBirr)}
                  </p>
                </div>
              </div>
            ) : (
              <div className="w-full bg-[#12121c]/40 border border-white/5 rounded-2xl p-4 text-slate-600 text-[10px]">
                🥈 #2
              </div>
            )}
          </div>

          {/* POSITION #1 - CENTER TOP (Gold Champion) */}
          <div className="flex flex-col items-center text-center -translate-y-3 z-10">
            {rank1 ? (
              <div className="w-full bg-gradient-to-b from-[#1c182a] to-[#12121e] border-2 border-amber-400/60 rounded-3xl p-3.5 flex flex-col items-center relative shadow-2xl shadow-amber-500/20">
                {/* Crown Header */}
                <div className="absolute -top-5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-xs flex items-center gap-1 shadow-lg shadow-amber-500/40 animate-pulse">
                  <Crown className="w-4 h-4 fill-slate-950" />
                  <span>🥇 #1</span>
                </div>

                <div className="relative mt-3 mb-2">
                  <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 blur-sm opacity-70 animate-pulse" />
                  <img
                    src={rank1.photoUrl}
                    alt={rank1.maskedName}
                    className="relative w-16 h-16 rounded-full object-cover border-2 border-amber-300 shadow-xl"
                  />
                  <div className="absolute -bottom-1 -right-1 bg-amber-500 text-slate-950 rounded-full p-1 border border-amber-200">
                    <Sparkles className="w-3.5 h-3.5 fill-slate-950" />
                  </div>
                </div>

                <p className="text-sm font-black text-amber-300 truncate max-w-[100px]">
                  {rank1.maskedName}
                </p>
                <p className="text-[10px] text-amber-200/70 truncate max-w-[100px]">
                  {rank1.maskedUsername}
                </p>

                <div className="mt-2.5 w-full pt-2 border-t border-amber-500/20 space-y-0.5">
                  <span className="text-xs text-purple-300 font-extrabold flex items-center justify-center gap-1">
                    <Users className="w-3 h-3 text-purple-400" />
                    {rank1.referralsCount} referrals
                  </span>
                  <p className="text-sm font-black text-amber-400 drop-shadow">
                    {formatCurrency(rank1.totalEarnedBirr)}
                  </p>
                </div>
              </div>
            ) : (
              <div className="w-full bg-[#12121c]/40 border border-white/5 rounded-3xl p-6 text-slate-600 text-xs">
                🥇 #1
              </div>
            )}
          </div>

          {/* POSITION #3 - RIGHT (Bronze) */}
          <div className="flex flex-col items-center text-center">
            {rank3 ? (
              <div className="w-full bg-[#12121c] border border-amber-700/30 rounded-2xl p-3 flex flex-col items-center relative shadow-lg shadow-slate-900/40">
                <div className="absolute -top-3.5 px-2 py-0.5 rounded-full bg-amber-900/80 text-amber-200 border border-amber-700/50 text-[10px] font-black flex items-center gap-0.5">
                  🥉 #3
                </div>

                <div className="relative mt-2 mb-2">
                  <img
                    src={rank3.photoUrl}
                    alt={rank3.maskedName}
                    className="w-12 h-12 rounded-full object-cover border-2 border-amber-700 shadow-md"
                  />
                  <div className="absolute -bottom-1 -right-1 bg-amber-900 text-amber-300 rounded-full p-0.5 border border-amber-700">
                    <Award className="w-3 h-3" />
                  </div>
                </div>

                <p className="text-xs font-black text-white truncate max-w-[85px]">
                  {rank3.maskedName}
                </p>
                <p className="text-[10px] text-slate-400 truncate max-w-[85px]">
                  {rank3.maskedUsername}
                </p>

                <div className="mt-2 w-full pt-1.5 border-t border-white/5 space-y-0.5">
                  <span className="text-[10px] text-purple-400 font-bold flex items-center justify-center gap-1">
                    <Users className="w-2.5 h-2.5" />
                    {rank3.referralsCount} {t('referrals.friends_count', { count: '' }).trim()}
                  </span>
                  <p className="text-[11px] font-extrabold text-amber-400">
                    {formatCurrency(rank3.totalEarnedBirr)}
                  </p>
                </div>
              </div>
            ) : (
              <div className="w-full bg-[#12121c]/40 border border-white/5 rounded-2xl p-4 text-slate-600 text-[10px]">
                🥉 #3
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RANKINGS LIST TABLE (#4 to #20) */}
      <div className="bg-[#0e0e15] border border-white/10 rounded-3xl p-4 shadow-xl space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-white/10 text-xs font-bold text-slate-400 px-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-400" />
            <span>Top 20 Leaderboard Rankings</span>
          </div>
          {Boolean(userRank) && (
            <span className="px-2 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px]">
              Your Rank: #{userRank}
            </span>
          )}
        </div>

        <div className="space-y-2">
          {restRankings.map((user) => (
            <div
              key={`rank_${user.rank}_${user.maskedUsername}`}
              className="flex items-center justify-between p-3 rounded-2xl bg-[#141420]/80 border border-white/5 hover:border-indigo-500/30 transition-all text-xs"
            >
              <div className="flex items-center gap-3">
                <span className="w-6 text-center font-black text-slate-400 font-mono text-xs">
                  #{user.rank}
                </span>

                <img
                  src={user.photoUrl}
                  alt={user.maskedName}
                  className="w-9 h-9 rounded-full object-cover border border-white/10"
                />

                <div>
                  <p className="font-bold text-white flex items-center gap-1">
                    {user.maskedName}
                    {user.isSampleData && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-normal">
                        sample
                      </span>
                    )}
                  </p>
                  <p className="text-[10px] text-slate-400">{user.maskedUsername}</p>
                </div>
              </div>

              <div className="text-right">
                <p className="font-extrabold text-amber-400">{formatCurrency(user.totalEarnedBirr)}</p>
                <p className="text-[10px] text-purple-400 font-medium">
                  {user.referralsCount} referrals
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
