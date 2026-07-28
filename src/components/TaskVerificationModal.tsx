import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Task } from '../types';
import { openExternalLink, triggerHaptic, getInitData } from '../lib/telegram';
import { useTranslation } from '../i18n/useTranslation';
import confetti from 'canvas-confetti';
import { CheckCircle2, ExternalLink, Timer, AlertCircle, Sparkles, X, ShieldCheck, Clock, Send } from 'lucide-react';

interface TaskVerificationModalProps {
  task: Task | null;
  onClose: () => void;
  onComplete: (taskId: string) => Promise<void>;
  onRefreshSubmissions?: () => void;
}

export const TaskVerificationModal: React.FC<TaskVerificationModalProps> = ({
  task,
  onClose,
  onComplete,
  onRefreshSubmissions
}) => {
  const { t, formatCurrency } = useTranslation();
  const [step, setStep] = useState<'initial' | 'visiting' | 'verifying' | 'completed' | 'submitted_pending'>('initial');
  const [countdown, setCountdown] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [proofInput, setProofInput] = useState<string>('');

  useEffect(() => {
    if (task) {
      setStep('initial');
      setCountdown(task.timerSeconds || 10);
      setErrorMsg(null);
      setIsSubmitting(false);
      setProofInput('');
    }
  }, [task]);

  useEffect(() => {
    let timer: any;
    if (step === 'visiting' && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (step === 'visiting' && countdown === 0) {
      setStep('verifying');
    }
    return () => clearInterval(timer);
  }, [step, countdown]);

  if (!task) return null;

  const isAdminCheckTask = task.verificationType === 'admin_check';

  const handleOpenTaskUrl = () => {
    triggerHaptic('light');
    if (task.targetUrl) {
      openExternalLink(task.targetUrl);
    }
    setStep('visiting');
  };

  const handleVerify = async () => {
    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      triggerHaptic('medium');

      await onComplete(task.id);

      setStep('completed');
      triggerHaptic('success');
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (err: any) {
      triggerHaptic('error');
      setErrorMsg(err.message || t('tasks.verification_failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitProof = async () => {
    if (!proofInput.trim()) {
      setErrorMsg(t('tasks.enter_proof_error'));
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      triggerHaptic('medium');

      const initData = getInitData();
      const res = await fetch('/api/tasks/submit-proof', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-telegram-init-data': initData
        },
        body: JSON.stringify({
          taskId: task.id,
          proofType: 'social_handle',
          proofData: proofInput.trim()
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || t('tasks.submit_proof_failed'));
      }

      setStep('submitted_pending');
      triggerHaptic('success');
      if (onRefreshSubmissions) onRefreshSubmissions();
    } catch (err: any) {
      triggerHaptic('error');
      setErrorMsg(err.message || t('tasks.submit_proof_failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#050508]/80 backdrop-blur-md">
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="w-full max-w-lg bg-[#0f0f15] border border-white/10 rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto relative overflow-hidden"
        >
          <div className="absolute -right-4 -top-4 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

          {/* Top Bar */}
          <div className="flex items-center justify-between border-b border-white/10 pb-3 relative z-10">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                <ShieldCheck className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-base font-bold text-white">{t('tasks.task_verification_title')}</h3>
                <p className="text-xs text-slate-400">{t('tasks.task_verification_subtitle')}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors border border-white/5"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Task Info Header */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2 relative z-10">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-purple-500/10 text-purple-300 border border-purple-500/20 uppercase tracking-wide">
                {task.platform || task.category}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-extrabold text-amber-400">+{formatCurrency(task.rewardBirr)}</span>
                <span className="text-xs text-slate-400">({task.rewardPoints} PTS)</span>
              </div>
            </div>
            <h4 className="text-base font-bold text-white">{task.title}</h4>
            <p className="text-xs text-slate-300 leading-relaxed">{task.description}</p>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-950/50 border border-rose-500/30 text-rose-300 text-xs relative z-10">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {step === 'completed' ? (
            <div className="text-center py-6 space-y-3 relative z-10">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto animate-bounce">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h4 className="text-xl font-bold text-white">{t('tasks.reward_claimed_title')}</h4>
              <p className="text-sm text-slate-300">
                {t('tasks.reward_claimed_desc', { birr: formatCurrency(task.rewardBirr), points: task.rewardPoints })}
              </p>
              <button
                onClick={onClose}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 font-bold text-white shadow-lg shadow-indigo-500/25 hover:brightness-110 transition-all"
              >
                {t('tasks.continue_earning')}
              </button>
            </div>
          ) : step === 'submitted_pending' ? (
            <div className="text-center py-6 space-y-3 relative z-10">
              <div className="w-16 h-16 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center mx-auto">
                <Clock className="w-10 h-10 animate-pulse" />
              </div>
              <h4 className="text-xl font-bold text-white">{t('tasks.proof_pending_title')}</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                {t('tasks.proof_pending_desc', { proof: proofInput, amount: formatCurrency(task.rewardBirr) })}
              </p>
              <button
                onClick={onClose}
                className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 font-bold text-white shadow-lg shadow-indigo-500/25 transition-all"
              >
                {t('common.close')}
              </button>
            </div>
          ) : (
            <div className="space-y-4 relative z-10">
              {/* Step 1: Open Target Link */}
              <div className="p-4 rounded-2xl bg-[#050508] border border-white/10 space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-semibold text-slate-200">{t('tasks.step1_open_link')}</span>
                  <span>{t('tasks.visit_link')}</span>
                </div>
                <button
                  onClick={handleOpenTaskUrl}
                  className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-600/20"
                >
                  <span>{t('tasks.open_task_btn', { platform: (task.platform || 'Link').toUpperCase() })}</span>
                  <ExternalLink className="w-4 h-4" />
                </button>
              </div>

              {/* Step 2 for Admin Check Tasks (YouTube, Instagram, Facebook): Enter Proof Handle / Link */}
              {isAdminCheckTask ? (
                <div className="p-4 rounded-2xl bg-[#050508] border border-white/10 space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-300 font-semibold">
                    <span>{t('tasks.step2_submit_proof')}</span>
                    <span className="text-amber-400 font-normal">{t('tasks.admin_approval')}</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    {t('tasks.proof_instructions', { platform: task.platform || 'social' })}
                  </p>
                  <input
                    type="text"
                    value={proofInput}
                    onChange={(e) => setProofInput(e.target.value)}
                    placeholder={
                      task.platform === 'youtube'
                        ? '@mychannel'
                        : task.platform === 'instagram'
                        ? '@my_instagram_username'
                        : task.platform === 'facebook'
                        ? 'facebook.com/myprofile'
                        : '@username'
                    }
                    className="w-full bg-[#0f0f15] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 placeholder:text-slate-500"
                  />
                  <button
                    onClick={handleSubmitProof}
                    disabled={isSubmitting || !proofInput.trim()}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-indigo-600 hover:brightness-110 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-md shadow-amber-500/20"
                  >
                    {isSubmitting ? (
                      <span>{t('tasks.submitting_proof')}</span>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>{t('tasks.submit_proof_btn')}</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <>
                  {/* Step 2 for Telegram / Direct Tasks */}
                  {step === 'visiting' && countdown > 0 && (
                    <div className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm font-medium">
                      <Timer className="w-5 h-5 animate-spin" />
                      <span>{t('tasks.wait_countdown', { seconds: countdown })}</span>
                    </div>
                  )}

                  {(step === 'verifying' || (step === 'visiting' && countdown === 0) || step === 'initial') && (
                    <button
                      onClick={handleVerify}
                      disabled={isSubmitting}
                      className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:brightness-110 text-white font-extrabold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-500/25 disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <span>{t('tasks.verifying_tg_membership')}</span>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>{t('tasks.verify_and_claim', { reward: formatCurrency(task.rewardBirr) })}</span>
                        </>
                      )}
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

