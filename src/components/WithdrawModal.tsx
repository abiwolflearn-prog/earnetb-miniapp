import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, WithdrawalMethod } from '../types';
import { triggerHaptic } from '../lib/telegram';
import confetti from 'canvas-confetti';
import { Wallet, AlertCircle, CheckCircle2, X, ArrowRight, ShieldCheck, Phone, CreditCard, Building2 } from 'lucide-react';

interface WithdrawModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmitWithdrawal: (data: {
    amount: number;
    method: WithdrawalMethod;
    accountNumber: string;
    accountName: string;
  }) => Promise<void>;
}

export const WithdrawModal: React.FC<WithdrawModalProps> = ({
  user,
  isOpen,
  onClose,
  onSubmitWithdrawal
}) => {
  const [method, setMethod] = useState<WithdrawalMethod>('telebirr');
  const [amount, setAmount] = useState<string>('2000');
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [accountName, setAccountName] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  if (!isOpen || !user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = Number(amount);

    if (isNaN(numericAmount) || numericAmount < 2000) {
      setErrorMsg('Minimum withdrawal amount is 2,000 Birr.');
      triggerHaptic('error');
      return;
    }

    if (numericAmount > user.balance) {
      setErrorMsg(`Insufficient balance. Your available balance is ${user.balance.toLocaleString()} Birr.`);
      triggerHaptic('error');
      return;
    }

    if (!accountNumber.trim()) {
      setErrorMsg('Please enter your account / phone number.');
      triggerHaptic('error');
      return;
    }

    if (!accountName.trim()) {
      setErrorMsg('Please enter the account holder full name.');
      triggerHaptic('error');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      await onSubmitWithdrawal({
        amount: numericAmount,
        method,
        accountNumber: accountNumber.trim(),
        accountName: accountName.trim()
      });

      setIsSuccess(true);
      triggerHaptic('success');
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 }
      });
    } catch (err: any) {
      triggerHaptic('error');
      setErrorMsg(err.message || 'Withdrawal submission failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const methodOptions: Array<{ id: WithdrawalMethod; name: string; icon: any; color: string; desc: string }> = [
    {
      id: 'telebirr',
      name: 'Telebirr',
      icon: Phone,
      color: 'from-cyan-500 to-blue-600',
      desc: 'Instant Ethio Telecom mobile wallet transfer'
    },
    {
      id: 'cbe_birr',
      name: 'CBE Birr',
      icon: CreditCard,
      color: 'from-purple-600 to-indigo-600',
      desc: 'Commercial Bank of Ethiopia mobile money'
    },
    {
      id: 'bank_transfer',
      name: 'Bank Transfer',
      icon: Building2,
      color: 'from-emerald-500 to-teal-600',
      desc: 'Direct deposit to any Ethiopian bank account'
    }
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#050508]/80 backdrop-blur-md">
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          className="w-full max-w-lg bg-[#0f0f15] border border-white/10 rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto relative overflow-hidden"
        >
          <div className="absolute -right-4 -top-4 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-3 relative z-10">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                <Wallet className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-base font-bold text-white">Withdraw Rewards</h3>
                <p className="text-xs text-slate-400">Cash out to Telebirr, CBE Birr or Bank</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors border border-white/5"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {isSuccess ? (
            <div className="text-center py-6 space-y-4 relative z-10">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto animate-bounce">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h4 className="text-xl font-bold text-white">Withdrawal Request Submitted!</h4>
              <p className="text-sm text-slate-300 leading-relaxed max-w-sm mx-auto">
                Your request for <strong className="text-amber-400">{Number(amount).toLocaleString()} Birr</strong> via <strong className="text-indigo-400">{method.toUpperCase()}</strong> is being processed and will be sent to account <code className="bg-white/10 border border-white/10 px-1.5 py-0.5 rounded text-white">{accountNumber}</code> shortly.
              </p>
              <button
                onClick={onClose}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 font-bold text-white shadow-lg shadow-indigo-500/25 hover:brightness-110 transition-all"
              >
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
              {/* Balance Summary */}
              <div className="p-3.5 rounded-2xl bg-[#050508] border border-white/10 flex items-center justify-between text-xs">
                <span className="text-slate-400">Available Balance:</span>
                <span className="font-extrabold text-amber-400 text-sm">{user.balance.toLocaleString()} Birr</span>
              </div>

              {errorMsg && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-950/50 border border-rose-500/30 text-rose-300 text-xs">
                  <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Payment Method Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Select Cashout Method</label>
                <div className="grid grid-cols-1 gap-2">
                  {methodOptions.map((opt) => {
                    const Icon = opt.icon;
                    const isSelected = method === opt.id;
                    return (
                      <button
                        type="button"
                        key={opt.id}
                        onClick={() => {
                          triggerHaptic('selection');
                          setMethod(opt.id);
                        }}
                        className={`w-full p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-indigo-500/10 border-indigo-500/50 ring-1 ring-indigo-500/30 text-white'
                            : 'bg-white/5 border-white/5 text-slate-400 hover:border-white/15'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${opt.color} flex items-center justify-center text-white`}>
                            <Icon className="w-4.5 h-4.5" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white">{opt.name}</p>
                            <p className="text-[11px] text-slate-400">{opt.desc}</p>
                          </div>
                        </div>
                        {isSelected && <CheckCircle2 className="w-5 h-5 text-indigo-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Amount Input */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-semibold text-slate-300">Withdrawal Amount (Birr)</label>
                  <span className="text-slate-400">Min: 2,000 Birr</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min="2000"
                    step="50"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-[#050508] border border-white/10 rounded-2xl px-4 py-3 text-white text-base font-bold focus:outline-none focus:border-indigo-500 pr-16"
                    placeholder="2000"
                  />
                  <button
                    type="button"
                    onClick={() => setAmount(user.balance.toString())}
                    className="absolute right-2 top-2 px-2.5 py-1 text-xs font-semibold rounded-xl bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 border border-indigo-500/30"
                  >
                    MAX
                  </button>
                </div>
              </div>

              {/* Account Number / Phone */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">
                  {method === 'telebirr' ? 'Telebirr Phone Number' : method === 'cbe_birr' ? 'CBE Birr Phone / Account' : 'Bank Account Number'}
                </label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="w-full bg-[#050508] border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500"
                  placeholder={method === 'telebirr' ? '0911223344' : '1000123456789'}
                />
              </div>

              {/* Full Name */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Account Holder Full Name</label>
                <input
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  className="w-full bg-[#050508] border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500"
                  placeholder="Abebe Bikila Tadesse"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || user.balance < 2000}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:brightness-110 font-extrabold text-white text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25 disabled:opacity-50 transition-all mt-2"
              >
                {isSubmitting ? (
                  <span>Processing Withdrawal...</span>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Submit Request ({Number(amount || 0).toLocaleString()} Birr)</span>
                  </>
                )}
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
