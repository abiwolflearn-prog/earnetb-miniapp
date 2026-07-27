import { TelegramUser } from '../types';

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string;
        initDataUnsafe?: {
          query_id?: string;
          user?: TelegramUser;
          auth_date?: string;
          hash?: string;
          start_param?: string;
        };
        version: string;
        platform: string;
        colorScheme: 'light' | 'dark';
        themeParams: Record<string, string>;
        isExpanded: boolean;
        viewportHeight: number;
        viewportStableHeight: number;
        headerColor: string;
        backgroundColor: string;
        BackButton: {
          isVisible: boolean;
          show: () => void;
          hide: () => void;
          onClick: (cb: () => void) => void;
          offClick: (cb: () => void) => void;
        };
        MainButton: {
          text: string;
          color: string;
          textColor: string;
          isVisible: boolean;
          isActive: boolean;
          isProgressVisible: boolean;
          setText: (text: string) => void;
          onClick: (cb: () => void) => void;
          offClick: (cb: () => void) => void;
          show: () => void;
          hide: () => void;
          enable: () => void;
          disable: () => void;
          showProgress: (leaveActive?: boolean) => void;
          hideProgress: () => void;
        };
        HapticFeedback: {
          impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
          notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
          selectionChanged: () => void;
        };
        ready: () => void;
        expand: () => void;
        close: () => void;
        openLink: (url: string, options?: { try_instant_view?: boolean }) => void;
        openTelegramLink: (url: string) => void;
        showAlert: (message: string, callback?: () => void) => void;
        showConfirm: (message: string, callback?: (confirmed: boolean) => void) => void;
      };
    };
  }
}

export function isTelegramWebAppAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  const tg = window.Telegram?.WebApp;
  if (!tg) return false;
  return Boolean(tg.initData || tg.initDataUnsafe?.user || tg.version || tg.platform);
}

export function getTelegramWebApp() {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
    return window.Telegram.WebApp;
  }
  return null;
}

export const MOCK_TELEGRAM_USERS: TelegramUser[] = [
  {
    id: 987654321,
    first_name: 'Abebe',
    last_name: 'Bikila',
    username: 'abebe_novatask',
    photo_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    language_code: 'am',
    is_premium: true
  },
  {
    id: 112233445,
    first_name: 'Selam',
    last_name: 'Tadesse',
    username: 'selam_rewards',
    photo_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    language_code: 'en',
    is_premium: false
  },
  {
    id: 556677889,
    first_name: 'Dawit',
    last_name: 'Girma',
    username: 'dawit_ethio',
    photo_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    language_code: 'en',
    is_premium: true
  }
];

export function getTelegramInitData(): string {
  const tg = getTelegramWebApp();
  if (tg) {
    if (tg.initData && tg.initData.trim() !== '') {
      return tg.initData;
    }
    if (tg.initDataUnsafe?.user) {
      const user = tg.initDataUnsafe.user;
      const authDate = tg.initDataUnsafe.auth_date || Math.floor(Date.now() / 1000);
      const hash = tg.initDataUnsafe.hash || 'simulated_hash_for_dev';
      return `user=${encodeURIComponent(JSON.stringify(user))}&auth_date=${authDate}&hash=${hash}`;
    }
  }

  // Fallback string for browser simulation
  const savedSimulatedUser = typeof localStorage !== 'undefined' 
    ? localStorage.getItem('novatask_simulated_tg_user') 
    : null;
  
  const user = savedSimulatedUser ? JSON.parse(savedSimulatedUser) : MOCK_TELEGRAM_USERS[0];
  
  return `user=${encodeURIComponent(JSON.stringify(user))}&auth_date=${Math.floor(Date.now() / 1000)}&hash=simulated_hash_for_dev`;
}

export const getInitData = getTelegramInitData;

export function triggerHaptic(type: 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'warning' | 'selection') {
  const tg = getTelegramWebApp();
  if (!tg?.HapticFeedback) return;

  if (['light', 'medium', 'heavy'].includes(type)) {
    tg.HapticFeedback.impactOccurred(type as 'light' | 'medium' | 'heavy');
  } else if (['success', 'error', 'warning'].includes(type)) {
    tg.HapticFeedback.notificationOccurred(type as 'success' | 'error' | 'warning');
  } else if (type === 'selection') {
    tg.HapticFeedback.selectionChanged();
  }
}

export function openExternalLink(url: string) {
  const tg = getTelegramWebApp();
  if (tg) {
    if (url.startsWith('https://t.me/')) {
      tg.openTelegramLink(url);
    } else {
      tg.openLink(url);
    }
  } else {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
