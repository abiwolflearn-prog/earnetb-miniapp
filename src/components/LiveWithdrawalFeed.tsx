import React, { useState, useEffect } from 'react';
import {
  Activity,
  ShieldCheck,
  Search,
  Filter,
  CreditCard,
  Building2,
  Phone,
  Clock,
  ArrowUpRight,
  Sparkles,
  TrendingUp,
  Wallet,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from '../i18n/useTranslation';

export interface WithdrawalFeedItem {
  id: string;
  rawName: string;
  maskedName: string;
  rawPhone: string;
  maskedPhone: string;
  rawAmount: number;
  maskedAmount: string;
  rawBank: string;
  maskedBank: string;
  method: string;
  timeAgo: string;
  status: 'approved' | 'completed' | 'pending';
  timestamp: number;
  isSampleData?: boolean;
}

export interface WithdrawalStats {
  totalCount: number;
  totalAmountBirr: number;
  todayCount: number;
  popularMethods: Array<{
    method: string;
    label: string;
    count: number;
    percentage: number;
  }>;
}

export const LiveWithdrawalFeed: React.FC = () => {
  const { t, formatCurrency } = useTranslation();

  const [withdrawals, setWithdrawals] = useState<WithdrawalFeedItem[]>([]);
  const [stats, setStats] = useState<WithdrawalStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasRealData, setHasRealData] = useState<boolean>(false);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'telebirr' | 'cbe_birr' | 'bank_transfer'>('all');
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());

  const fetchFeedData = async () => {
    try {
      const res = await fetch('/api/withdrawals/recent');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setWithdrawals(data.withdrawals || []);
          setStats(data.stats || null);
          setHasRealData(Boolean(data.hasRealData));
          setLastRefreshedAt(new Date());
        }
      }
    } catch (err) {
      console.error('Failed to load live withdrawal feed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedData();
    // Auto refresh feed every 12 seconds for live animation
    const interval = setInterval(fetchFeedData, 12000);
    return () => clearInterval(interval);
  }, []);

  // Filter withdrawals
  const filteredWithdrawals = withdrawals.filter((item) => {
    const matchesFilter =
      selectedFilter === 'all' || item.method === selectedFilter;

    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      item.maskedName.toLowerCase().includes(query) ||
      item.maskedBank.toLowerCase().includes(query) ||
      item.maskedAmount.toLowerCase().includes(query) ||
      item.method.toLowerCase().includes(query);

    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-5">
      {/* HEADER & LIVE PULSE */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-400 animate-pulse" />
              <span>{t('withdrawal_feed.title')}</span>
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-extrabold flex items-center gap-1 shadow-sm shadow-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              LIVE (80+)
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {t('withdrawal_feed.subtitle')}
          </p>
        </div>

        <button
          onClick={fetchFeedData}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-xs flex items-center gap-1 transition-all active:scale-95"
          title="Refresh Live Stream"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
        </button>
      </div>

      {/* PRIVACY PROTECTION BANNER */}
      <div className="p-3.5 rounded-2xl bg-indigo-950/30 border border-indigo-500/20 text-xs text-indigo-200 flex items-start gap-2.5 shadow-lg">
        <ShieldCheck className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-bold text-indigo-300">
            {t('withdrawal_feed.privacy_note')}
          </p>
          <p className="text-[11px] text-slate-400">
            Names (e.g. <span className="text-indigo-300 font-mono">A**l</span>), phone numbers (<span className="text-indigo-300 font-mono">09******20</span>), amounts (<span className="text-indigo-300 font-mono">2*** Birr</span>), and bank details (<span className="text-indigo-300 font-mono">C** Bank</span>) are securely masked.
          </p>
        </div>
      </div>

      {/* WITHDRAWAL STATISTICS CARD */}
      {Boolean(stats) && (
        <div className="p-4 rounded-3xl bg-[#0f0f18] border border-white/10 space-y-4 shadow-xl relative overflow-hidden">
          <div className="absolute -right-6 -top-6 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Platform Withdrawal Statistics
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              Updated: {lastRefreshedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2.5 rounded-2xl bg-white/5 border border-white/5 space-y-0.5">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">
                {t('withdrawal_feed.stats_total_count')}
              </p>
              <p className="text-lg font-black text-white">
                {stats?.totalCount.toLocaleString()}
              </p>
            </div>

            <div className="p-2.5 rounded-2xl bg-white/5 border border-white/5 space-y-0.5">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">
                {t('withdrawal_feed.stats_total_amount')}
              </p>
              <p className="text-lg font-black text-amber-400">
                {formatCurrency(stats?.totalAmountBirr || 0)}
              </p>
            </div>

            <div className="p-2.5 rounded-2xl bg-white/5 border border-white/5 space-y-0.5">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">
                {t('withdrawal_feed.stats_today')}
              </p>
              <p className="text-lg font-black text-emerald-400">
                {stats?.todayCount}
              </p>
            </div>
          </div>

          {/* Popular Cashout Methods Progress Bars */}
          <div className="space-y-2 pt-1">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              {t('withdrawal_feed.stats_methods')}
            </p>
            <div className="space-y-1.5">
              {stats?.popularMethods.map((pm) => (
                <div key={pm.method} className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-300 font-medium flex items-center gap-1">
                      {pm.method === 'telebirr' && <Wallet className="w-3 h-3 text-cyan-400" />}
                      {pm.method === 'cbe_birr' && <CreditCard className="w-3 h-3 text-purple-400" />}
                      {pm.method === 'bank_transfer' && <Building2 className="w-3 h-3 text-amber-400" />}
                      {pm.label}
                    </span>
                    <span className="font-extrabold text-white">
                      {pm.percentage}% ({pm.count})
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-[#05050a] rounded-full overflow-hidden border border-white/5">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        pm.method === 'telebirr'
                          ? 'bg-cyan-400'
                          : pm.method === 'cbe_birr'
                          ? 'bg-purple-500'
                          : 'bg-amber-400'
                      }`}
                      style={{ width: `${pm.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SAMPLE DATA / REAL DATA NOTICE */}
      {!hasRealData && (
        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{t('withdrawal_feed.sample_notice')}</span>
        </div>
      )}

      {/* SEARCH AND FILTER BAR */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('withdrawal_feed.search_placeholder')}
            className="w-full bg-[#101018] border border-white/10 rounded-2xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50"
          />
        </div>

        <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all ${
              selectedFilter === 'all'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30'
                : 'bg-white/5 text-slate-400 hover:text-white'
            }`}
          >
            {t('withdrawal_feed.filter_all')}
          </button>
          <button
            onClick={() => setSelectedFilter('telebirr')}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all ${
              selectedFilter === 'telebirr'
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-500/30'
                : 'bg-white/5 text-slate-400 hover:text-white'
            }`}
          >
            Telebirr
          </button>
          <button
            onClick={() => setSelectedFilter('cbe_birr')}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all ${
              selectedFilter === 'cbe_birr'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-500/30'
                : 'bg-white/5 text-slate-400 hover:text-white'
            }`}
          >
            CBE Birr
          </button>
          <button
            onClick={() => setSelectedFilter('bank_transfer')}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all ${
              selectedFilter === 'bank_transfer'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-500/30'
                : 'bg-white/5 text-slate-400 hover:text-white'
            }`}
          >
            Bank Transfer
          </button>
        </div>
      </div>

      {/* RECENT WITHDRAWALS LIVE FEED CARDS (80+ ITEMS SCROLLABLE) */}
      <div className="space-y-2.5 max-h-[540px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10">
        {isLoading ? (
          <div className="p-8 text-center text-slate-500 text-xs animate-pulse">
            Loading recent withdrawals live stream...
          </div>
        ) : filteredWithdrawals.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs bg-[#0f0f15] rounded-3xl border border-white/5">
            No withdrawal records match your search or filter.
          </div>
        ) : (
          <AnimatePresence mode="popLayout" initial={false}>
            {filteredWithdrawals.map((item, idx) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 80, scale: 0.92 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -40, scale: 0.9 }}
                transition={{
                  type: 'spring',
                  stiffness: 600,
                  damping: 28,
                  mass: 0.5,
                  delay: Math.min(idx * 0.008, 0.08)
                }}
                className="p-3.5 rounded-2xl bg-[#11111a] border border-white/10 hover:border-emerald-500/50 hover:bg-[#151522] transition-colors shadow-md relative overflow-hidden group"
              >
                {/* Visual side accent bar */}
                <div
                  className={`absolute left-0 top-0 bottom-0 w-1 ${
                    item.method === 'telebirr'
                      ? 'bg-cyan-400'
                      : item.method === 'cbe_birr'
                      ? 'bg-purple-400'
                      : 'bg-amber-400'
                  }`}
                />

                <div className="pl-1 space-y-2">
                  {/* Top Row: Masked Name & Amount */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-sm text-white tracking-wide font-mono flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                        {item.maskedName}
                      </span>
                      {item.isSampleData && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700 font-mono">
                          sample
                        </span>
                      )}
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-black text-emerald-400 font-mono bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg shadow-sm group-hover:bg-emerald-500/20 transition-colors">
                        Withdrawn: {item.maskedAmount}
                      </span>
                    </div>
                  </div>

                  {/* Details Grid: Bank, Phone, Time */}
                  <div className="grid grid-cols-3 gap-2 text-[11px] pt-1 border-t border-white/5 text-slate-300 font-mono">
                    <div className="flex items-center gap-1.5 truncate">
                      <Building2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span className="truncate" title={item.maskedBank}>
                        Bank: <strong className="text-white">{item.maskedBank}</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 truncate">
                      <Phone className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span className="truncate">
                        Phone: <strong className="text-slate-200">{item.maskedPhone}</strong>
                      </span>
                    </div>

                    <div className="flex items-center justify-end gap-1 text-slate-400 text-[10px]">
                      <Clock className="w-3 h-3 text-slate-500 shrink-0" />
                      <span>{item.timeAgo}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};
