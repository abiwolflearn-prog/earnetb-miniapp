import React, { useState } from 'react';
import { User, Withdrawal, Transaction } from '../types';
import { useTranslation } from '../i18n/useTranslation';
import { Wallet, ArrowDownRight, ArrowUpRight, Phone, CreditCard, Building2 } from 'lucide-react';

interface WalletPageProps {
  user: User;
  withdrawals: Withdrawal[];
  transactions: Transaction[];
  onOpenWithdrawModal: () => void;
}

export const WalletPage: React.FC<WalletPageProps> = ({
  user,
  withdrawals,
  transactions,
  onOpenWithdrawModal
}) => {
  const { t, formatCurrency } = useTranslation();
  const [filterType, setFilterType] = useState<'all' | 'reward' | 'withdrawal' | 'referral'>('all');

  const minThreshold = 2000;
  const isEligible = user.balance >= minThreshold;
  const progressPercent = Math.min(100, Math.round((user.balance / minThreshold) * 100));

  const filteredTxs = transactions.filter((tx) => {
    if (filterType === 'reward') return tx.type === 'task_reward' || tx.type === 'daily_checkin';
    if (filterType === 'withdrawal') return tx.type === 'withdrawal';
    if (filterType === 'referral') return tx.type === 'referral_bonus';
    return true;
  });

  return (
    <div className="space-y-5 pb-24">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-black text-white">{t('wallet.title')}</h2>
        <p className="text-xs text-slate-400">{t('wallet.subtitle')}</p>
      </div>

      {/* Main Balance Card */}
      <div className="p-6 rounded-3xl bg-[#0f0f15] border border-white/10 space-y-4 shadow-xl relative overflow-hidden">
        <div className="absolute -right-4 -top-4 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">{t('wallet.available_cash_balance')}</span>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            {t('wallet.verified_account')}
          </span>
        </div>

        <div>
          <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-300 to-purple-500">
            {formatCurrency(user.balance)}
          </h2>
          <p className="text-xs text-indigo-400 mt-1">{t('wallet.equivalent_points', { points: user.points.toLocaleString() })}</p>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5 pt-3 border-t border-white/10">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">{t('wallet.cashout_threshold')}</span>
            <span className="font-bold text-white">{progressPercent}%</span>
          </div>
          <div className="w-full h-2.5 bg-[#050508] rounded-full overflow-hidden border border-white/10">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <button
          onClick={onOpenWithdrawModal}
          disabled={!isEligible}
          className={`w-full py-3.5 rounded-2xl font-extrabold text-sm flex items-center justify-center gap-2 transition-all shadow-lg ${
            isEligible
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-indigo-500/25 hover:brightness-110'
              : 'bg-white/5 text-slate-500 cursor-not-allowed border border-white/5'
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span>{isEligible ? t('wallet.request_cashout') : t('wallet.earn_more_to_cashout', { amount: formatCurrency(2000 - user.balance) })}</span>
        </button>
      </div>

      {/* Payment Partners Showcase */}
      <div className="p-5 rounded-3xl bg-[#0f0f15] border border-white/5 space-y-3">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('wallet.payment_partners')}</h4>
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="p-3 rounded-2xl bg-white/5 border border-white/5 space-y-1">
            <Phone className="w-5 h-5 text-indigo-400 mx-auto" />
            <span className="font-bold text-white block text-[11px]">Telebirr</span>
            <span className="text-[9px] text-slate-400 block">{t('wallet.telebirr_desc')}</span>
          </div>
          <div className="p-3 rounded-2xl bg-white/5 border border-white/5 space-y-1">
            <CreditCard className="w-5 h-5 text-purple-400 mx-auto" />
            <span className="font-bold text-white block text-[11px]">CBE Birr</span>
            <span className="text-[9px] text-slate-400 block">{t('wallet.cbe_birr_desc')}</span>
          </div>
          <div className="p-3 rounded-2xl bg-white/5 border border-white/5 space-y-1">
            <Building2 className="w-5 h-5 text-emerald-400 mx-auto" />
            <span className="font-bold text-white block text-[11px]">Bank Transfer</span>
            <span className="text-[9px] text-slate-400 block">{t('wallet.bank_desc')}</span>
          </div>
        </div>
      </div>

      {/* Transaction History Header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white">{t('wallet.tx_history')}</h3>
          <div className="flex items-center gap-1.5 text-xs">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1 rounded-xl ${filterType === 'all' ? 'bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30' : 'text-slate-400'}`}
            >
              {t('wallet.filter_all')}
            </button>
            <button
              onClick={() => setFilterType('reward')}
              className={`px-3 py-1 rounded-xl ${filterType === 'reward' ? 'bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30' : 'text-slate-400'}`}
            >
              {t('wallet.filter_tasks')}
            </button>
            <button
              onClick={() => setFilterType('withdrawal')}
              className={`px-3 py-1 rounded-xl ${filterType === 'withdrawal' ? 'bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30' : 'text-slate-400'}`}
            >
              {t('wallet.filter_cashout')}
            </button>
          </div>
        </div>

        {/* Transactions list */}
        <div className="space-y-2">
          {filteredTxs.map((tx) => (
            <div key={tx.id} className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    tx.amount > 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  }`}
                >
                  {tx.amount > 0 ? <ArrowDownRight className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                </div>
                <div>
                  <p className="text-xs font-bold text-white">{tx.description}</p>
                  <p className="text-[10px] text-slate-500">{new Date(tx.createdAt).toLocaleString()}</p>
                </div>
              </div>

              <div className="text-right flex-shrink-0">
                <span className={`text-sm font-extrabold block ${tx.amount > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {tx.amount > 0 ? `+${formatCurrency(tx.amount)}` : formatCurrency(tx.amount)}
                </span>
                <span className="text-[10px] uppercase font-semibold text-slate-400">{tx.status}</span>
              </div>
            </div>
          ))}

          {filteredTxs.length === 0 && (
            <div className="p-8 rounded-3xl bg-[#0f0f15] border border-white/5 text-center text-slate-400 text-xs">
              {t('wallet.no_transactions')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

