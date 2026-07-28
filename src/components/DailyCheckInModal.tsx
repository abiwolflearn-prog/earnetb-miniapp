import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User } from '../types';
import { triggerHaptic } from '../lib/telegram';
import { useTranslation } from '../i18n/useTranslation';
import confetti from 'canvas-confetti';
import { Flame, CheckCircle2, AlertCircle, X, Sparkles } from 'lucide-react';

interface DailyCheckInModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onCheckIn: () => Promise<void>;
}

export const DailyCheckInModal: React.FC<DailyCheckInModalProps> = ({
  user,
  isOpen,
  onClose,
  onCheckIn
}) => {
  const { t, formatCurrency } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !user) return null;

  const todayStr = new Date().toISOString().split('T')[0];
  const lastCheckInStr = user.lastCheckIn ? user.lastCheckIn.split('T')[0] : null;
  const isAlreadyCheckedInToday = lastCheckInStr === todayStr;

  const streakDays = [1, 2, 3, 4, 5, 6, 7];

  const handleClaim = async () => {
    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      await onCheckIn();
      triggerHaptic('success');
      confetti({
        particleCount: 90,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (err: any) {
      triggerHaptic('error');
      setErrorMsg(err.message || t('tasks.already_checked_in'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl space-y-5"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Flame className="w-5 h-5 fill-amber-400/20" />
              </span>
              <div>
                <h3 className="text-base font-bold text-white">{t('tasks.daily_streak_title')}</h3>
                <p className="text-xs text-slate-400">{t('tasks.daily_streak_subtitle')}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Current Streak Indicator */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-indigo-950/40 border border-amber-500/30 flex items-center justify-between">
            <div>
              <p className="text-xs text-amber-300 font-medium">{t('tasks.current_streak')}</p>
              <h4 className="text-2xl font-black text-white flex items-center gap-1.5 mt-0.5">
                <span>{t('tasks.streak_days_count', { days: user.dailyStreak })}</span>
                <Flame className="w-6 h-6 text-amber-400 fill-amber-400 animate-pulse" />
              </h4>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-slate-400">{t('tasks.next_multiplier')}</p>
              <p className="text-sm font-bold text-amber-400">+{formatCurrency(Math.min(user.dailyStreak + 1, 7) * 20)}</p>
            </div>
          </div>

          {errorMsg && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-950/50 border border-rose-500/30 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 7-Day Rewards Grid */}
          <div className="grid grid-cols-7 gap-1.5">
            {streakDays.map((dayNum) => {
              const isPast = dayNum <= user.dailyStreak;
              const isCurrent = dayNum === user.dailyStreak + 1;
              const rewardBirr = dayNum * 20;

              return (
                <div
                  key={dayNum}
                  className={`flex flex-col items-center justify-between p-2 rounded-xl border text-center transition-all ${
                    isPast
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                      : isCurrent
                      ? 'bg-amber-950/60 border-amber-500 text-amber-200 ring-2 ring-amber-500/30'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <span className="text-[10px] font-semibold opacity-75">{t('tasks.day_n', { day: dayNum })}</span>
                  <div className="my-1.5">
                    {isPast ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto" />
                    ) : (
                      <span className="text-xs font-black text-amber-400">+{rewardBirr}</span>
                    )}
                  </div>
                  <span className="text-[9px] text-slate-400">{t('common.birr')}</span>
                </div>
              );
            })}
          </div>

          {/* Check-In Action Button */}
          {isAlreadyCheckedInToday ? (
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center space-y-1">
              <div className="flex items-center justify-center gap-2 text-emerald-400 font-semibold text-sm">
                <CheckCircle2 className="w-4 h-4" />
                <span>{t('tasks.checked_in_today')}</span>
              </div>
              <p className="text-xs text-slate-400">{t('tasks.come_back_tomorrow')}</p>
            </div>
          ) : (
            <button
              onClick={handleClaim}
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>{t('tasks.claiming_reward')}</span>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>{t('tasks.claim_daily_bonus', { amount: formatCurrency(Math.min(user.dailyStreak + 1, 7) * 20) })}</span>
                </>
              )}
            </button>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

