import React from 'react';
import { Home, CheckSquare, Wallet, Users, User } from 'lucide-react';
import { triggerHaptic } from '../lib/telegram';

export type TabType = 'home' | 'tasks' | 'wallet' | 'referrals' | 'profile';

interface NavbarProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
  pendingTasksCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, onChangeTab, pendingTasksCount = 0 }) => {
  const tabs = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare, badge: pendingTasksCount },
    { id: 'wallet', label: 'Wallet', icon: Wallet },
    { id: 'referrals', label: 'Invite', icon: Users },
    { id: 'profile', label: 'Profile', icon: User }
  ];

  const handleTabClick = (tabId: TabType) => {
    triggerHaptic('selection');
    onChangeTab(tabId);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#0a0a0f]/90 backdrop-blur-2xl border-t border-white/10 px-2 py-1.5 sm:pb-3">
      <div className="max-w-md mx-auto grid grid-cols-5 gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id as TabType)}
              className={`relative flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all ${
                isActive
                  ? 'text-indigo-400 font-semibold scale-105'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                {Boolean(tab.badge && tab.badge > 0) && (
                  <span className="absolute -top-1 -right-2 w-4 h-4 rounded-full bg-indigo-500 text-white text-[10px] font-extrabold flex items-center justify-center shadow-[0_0_8px_rgba(99,102,241,0.5)] animate-pulse">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-1 tracking-tight">{tab.label}</span>

              {/* Active Glow Pill */}
              {isActive && (
                <div className="absolute -top-1.5 w-6 h-1 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
