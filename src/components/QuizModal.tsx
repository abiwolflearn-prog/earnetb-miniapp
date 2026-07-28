import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Task } from '../types';
import { triggerHaptic } from '../lib/telegram';
import { useTranslation } from '../i18n/useTranslation';
import confetti from 'canvas-confetti';
import { HelpCircle, CheckCircle2, AlertCircle, X, Sparkles, Award } from 'lucide-react';

interface QuizModalProps {
  task: Task | null;
  onClose: () => void;
  onComplete: (taskId: string, answers: number[]) => Promise<void>;
}

export const QuizModal: React.FC<QuizModalProps> = ({ task, onClose, onComplete }) => {
  const { t, formatCurrency } = useTranslation();
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  if (!task || !task.quizQuestions || task.quizQuestions.length === 0) return null;

  const currentQ = task.quizQuestions[currentQuestionIdx];

  const handleSelectOption = (optionIndex: number) => {
    triggerHaptic('selection');
    const updated = [...selectedAnswers];
    updated[currentQuestionIdx] = optionIndex;
    setSelectedAnswers(updated);
    setErrorMsg(null);
  };

  const handleNext = async () => {
    if (selectedAnswers[currentQuestionIdx] === undefined) {
      setErrorMsg(t('tasks.select_option_error'));
      return;
    }

    if (currentQuestionIdx < task.quizQuestions!.length - 1) {
      setCurrentQuestionIdx((prev) => prev + 1);
    } else {
      // Submit full quiz
      try {
        setIsSubmitting(true);
        setErrorMsg(null);
        await onComplete(task.id, selectedAnswers);
        setIsSuccess(true);
        triggerHaptic('success');
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.6 }
        });
      } catch (err: any) {
        triggerHaptic('error');
        setErrorMsg(err.message || t('tasks.quiz_failed'));
      } finally {
        setIsSubmitting(false);
      }
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
              <span className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <HelpCircle className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-base font-bold text-white">{t('tasks.quiz_task_title')}</h3>
                <p className="text-xs text-slate-400">{t('tasks.quiz_subtitle', { reward: formatCurrency(task.rewardBirr) })}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {isSuccess ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto animate-bounce">
                <Award className="w-10 h-10" />
              </div>
              <h4 className="text-xl font-bold text-white">{t('tasks.quiz_mastered_title')}</h4>
              <p className="text-sm text-slate-300">
                {t('tasks.quiz_mastered_desc', { birr: formatCurrency(task.rewardBirr), points: task.rewardPoints })}
              </p>
              <button
                onClick={onClose}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 font-bold text-white shadow-lg shadow-cyan-500/20"
              >
                {t('tasks.back_to_tasks')}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Progress indicator */}
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>{t('tasks.question_progress', { current: currentQuestionIdx + 1, total: task.quizQuestions.length })}</span>
                <span className="font-semibold text-purple-400">{t('tasks.reward_label', { reward: formatCurrency(task.rewardBirr) })}</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-cyan-400 transition-all duration-300"
                  style={{ width: `${((currentQuestionIdx + 1) / task.quizQuestions.length) * 100}%` }}
                />
              </div>

              {/* Question Box */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                <h4 className="text-base font-bold text-slate-100">{currentQ.question}</h4>
              </div>

              {errorMsg && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-950/50 border border-rose-500/30 text-rose-300 text-xs">
                  <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Options */}
              <div className="space-y-2">
                {currentQ.options.map((opt, optionIndex) => {
                  const isSelected = selectedAnswers[currentQuestionIdx] === optionIndex;
                  return (
                    <button
                      key={optionIndex}
                      onClick={() => handleSelectOption(optionIndex)}
                      className={`w-full p-3.5 rounded-xl text-left text-sm transition-all border flex items-center justify-between ${
                        isSelected
                          ? 'bg-purple-950/60 border-purple-500 text-purple-100 font-semibold shadow-md shadow-purple-950/50'
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <span>{opt}</span>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-purple-400" />}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={handleNext}
                disabled={isSubmitting}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 font-bold text-white text-sm flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>{t('tasks.checking_answers')}</span>
                ) : (
                  <>
                    <span>{currentQuestionIdx < task.quizQuestions.length - 1 ? t('tasks.next_question') : t('tasks.submit_quiz')}</span>
                    <Sparkles className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

