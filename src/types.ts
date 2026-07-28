/**
 * NovaTask Telegram Mini App - Shared Type Definitions
 */

export type TaskCategory = 'social' | 'engagement' | 'video' | 'article' | 'quiz' | 'daily';
export type VerificationType = 'link_visit' | 'channel_join' | 'quiz' | 'timer' | 'admin_check' | 'instant';
export type SocialPlatform = 'telegram' | 'youtube' | 'instagram' | 'facebook' | 'other';
export type WithdrawalMethod = 'telebirr' | 'cbe_birr' | 'bank_transfer';
export type WithdrawalStatus = 'pending' | 'approved' | 'rejected';
export type TaskSubmissionStatus = 'pending' | 'approved' | 'rejected';

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  language_code?: string;
  is_premium?: boolean;
}

export interface User {
  id: string;
  telegramId: number;
  username: string;
  firstName: string;
  lastName?: string;
  photoUrl?: string;
  balance: number; // in Birr
  points: number; // internal points
  referralsCount: number;
  referredBy?: number;
  referralCode: string;
  dailyStreak: number;
  lastCheckIn?: string; // ISO Date
  isBlocked: boolean;
  role: 'user' | 'admin';
  ipAddresses?: string[];
  lastIp?: string;
  riskScore?: number; // 0 to 100
  fraudFlags?: string[];
  lastTaskCompletedAt?: string;
  createdAt: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  category: TaskCategory;
  platform?: SocialPlatform;
  rewardBirr: number;
  rewardPoints: number;
  verificationType: VerificationType;
  targetUrl?: string;
  channelUsername?: string; // e.g. '@NovaTaskOfficial'
  quizQuestions?: QuizQuestion[];
  timerSeconds?: number;
  status: 'active' | 'inactive';
  expiresAt?: string;
  completionsCount: number;
  maxCompletions?: number;
  createdAt: string;
}

export interface TaskSubmission {
  id: string;
  userId: string;
  telegramId: number;
  username: string;
  taskId: string;
  taskTitle: string;
  category: TaskCategory;
  platform?: SocialPlatform;
  verificationType: VerificationType;
  proofType: 'social_handle' | 'screenshot_url' | 'text_proof' | 'telegram_auto';
  proofData: string;
  rewardBirr: number;
  rewardPoints: number;
  status: TaskSubmissionStatus;
  adminNote?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CompletedTask {
  id: string;
  userId: string;
  telegramId: number;
  taskId: string;
  taskTitle: string;
  rewardBirr: number;
  rewardPoints: number;
  completedAt: string;
}

export interface Withdrawal {
  id: string;
  userId: string;
  telegramId: number;
  username: string;
  amount: number; // Minimum 2000 Birr
  method: WithdrawalMethod;
  accountNumber: string;
  accountName: string;
  status: WithdrawalStatus;
  adminNote?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Transaction {
  id: string;
  userId: string;
  type: 'task_reward' | 'referral_bonus' | 'daily_checkin' | 'withdrawal';
  amount: number; // positive or negative Birr
  points: number;
  description: string;
  status: 'completed' | 'pending' | 'rejected';
  createdAt: string;
}

export interface AdminAnalytics {
  totalUsers: number;
  activeUsers24h: number;
  completedTasksCount: number;
  totalRewardsDistributedBirr: number;
  totalPendingWithdrawalsBirr: number;
  pendingWithdrawalsCount: number;
  pendingSubmissionsCount: number;
  blockedUsersCount: number;
  flaggedUsersCount: number;
}

export interface SystemSettings {
  minWithdrawalBirr: number;
  maintenanceMode: boolean;
  botUsername: string;
  botTokenConfigured: boolean;
  systemNotice: string;
  autoApprovalThreshold: number;
}

export interface BroadcastNotification {
  id: string;
  title: string;
  message: string;
  targetAudience: 'all' | 'active' | 'blocked';
  sentAt: string;
  recipientCount: number;
}

export interface BotCommandResponse {
  command: string;
  text: string;
  inlineKeyboard?: Array<Array<{ text: string; url?: string; callback_data?: string; web_app?: { url: string } }>>;
}
