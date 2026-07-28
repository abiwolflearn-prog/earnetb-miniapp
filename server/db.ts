import fs from 'fs';
import path from 'path';
import { User, Task, CompletedTask, Withdrawal, Transaction, AdminAnalytics, TaskSubmission, SystemSettings, BroadcastNotification } from '../src/types';
import { INITIAL_TASKS } from '../src/data/initialTasks';
import { connectToMongoDB, loadFromMongoDB, saveToMongoDB } from './mongodb';

const DATA_DIR = path.join(process.cwd(), '.data');
const DB_FILE = path.join(DATA_DIR, 'novatask_db.json');
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8949365811:AAGY21gSy4WMH0paRWSI08jQez2jJEe6lg4';

export interface DatabaseSchema {
  users: User[];
  tasks: Task[];
  completedTasks: CompletedTask[];
  taskSubmissions: TaskSubmission[];
  withdrawals: Withdrawal[];
  transactions: Transaction[];
  systemSettings?: SystemSettings;
  broadcasts?: BroadcastNotification[];
}

// In-memory cache synced with JSON disk storage & MongoDB Atlas
let dbCache: DatabaseSchema = {
  users: [],
  tasks: [...INITIAL_TASKS],
  completedTasks: [],
  taskSubmissions: [],
  withdrawals: [],
  transactions: [],
  systemSettings: {
    minWithdrawalBirr: 2000,
    maintenanceMode: false,
    botUsername: '@EtNovaTasksbot',
    botTokenConfigured: true,
    systemNotice: 'NovaTask Official Platform active and fully operational.',
    autoApprovalThreshold: 150
  },
  broadcasts: []
};

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function loadDatabase(): DatabaseSchema {
  try {
    ensureDataDir();
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(content) as DatabaseSchema;
      
      // Ensure initial tasks exist if database was empty
      if (!parsed.tasks || parsed.tasks.length === 0) {
        parsed.tasks = [...INITIAL_TASKS];
      }

      if (!parsed.taskSubmissions) {
        parsed.taskSubmissions = [];
      }
      
      dbCache = parsed;
      return parsed;
    } else {
      saveDatabase(dbCache);
    }
  } catch (err) {
    console.error('Error loading database file, using fallback cache:', err);
  }
  return dbCache;
}

export function saveDatabase(data: DatabaseSchema) {
  try {
    ensureDataDir();
    dbCache = data;
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    
    // Async background sync to MongoDB Atlas
    saveToMongoDB(data).catch((err) => {
      console.warn('Background MongoDB save error:', err.message);
    });
  } catch (err) {
    console.error('Error saving database to file:', err);
  }
}

export async function initDatabaseFromMongo() {
  try {
    const mongoData = await loadFromMongoDB();
    if (mongoData) {
      if (!mongoData.tasks || mongoData.tasks.length === 0) {
        mongoData.tasks = [...INITIAL_TASKS];
      }
      dbCache = mongoData;
      ensureDataDir();
      fs.writeFileSync(DB_FILE, JSON.stringify(dbCache, null, 2), 'utf-8');
      console.log(' Successfully hydrated NovaTask database state from MongoDB Atlas cluster!');
    } else {
      // First time MongoDB load, seed Mongo with local data
      saveToMongoDB(dbCache).catch(() => {});
    }
  } catch (err: any) {
    console.warn('MongoDB initial hydration warning:', err.message);
  }
}

// Initialize on load
loadDatabase();


/**
 * Real Telegram Bot API Channel Membership Verification
 */
export async function verifyTelegramChannelMembership(
  userTelegramId: number,
  channelUsernameOrUrl?: string
): Promise<{ isMember: boolean; status?: string; message?: string }> {
  try {
    let cleanChatId = (channelUsernameOrUrl || '@NovaTaskOfficial').trim();
    if (cleanChatId.startsWith('https://t.me/')) {
      cleanChatId = '@' + cleanChatId.replace('https://t.me/', '').replace('/', '');
    }
    if (!cleanChatId.startsWith('@') && !cleanChatId.startsWith('-100')) {
      cleanChatId = '@' + cleanChatId;
    }

    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getChatMember?chat_id=${encodeURIComponent(cleanChatId)}&user_id=${userTelegramId}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.ok && data.result) {
      const status = data.result.status; // 'creator', 'administrator', 'member', 'restricted', 'left', 'kicked'
      const isMember = ['creator', 'administrator', 'member', 'restricted'].includes(status);
      if (isMember) {
        return { isMember: true, status };
      } else {
        return {
          isMember: false,
          status,
          message: `Membership Check Failed: Your status in ${cleanChatId} is "${status}". Please join the channel first, then tap Verify!`
        };
      }
    } else {
      const description = data.description || 'Channel not found or bot is not an administrator in channel';
      console.warn(`Telegram API error for ${cleanChatId}:`, description);
      
      // If the target channel hasn't added the bot as administrator yet or is custom, provide detailed guidance
      return {
        isMember: false,
        message: `Telegram Membership Verification Notice: Could not verify membership for ${cleanChatId} (${description}). Please make sure you joined ${cleanChatId} and that @EtNovaTasksbot is an administrator in the channel!`
      };
    }
  } catch (err: any) {
    console.error('Error verifying Telegram membership via Bot API:', err);
    return {
      isMember: false,
      message: `Telegram API Connection Error: ${err.message || 'Unable to reach Telegram Bot API'}`
    };
  }
}

export const db = {
  // Fraud Detection & IP Logging
  async evaluateUserFraudRisk(userId: string, clientIp: string): Promise<User> {
    const data = loadDatabase();
    const user = data.users.find(u => u.id === userId);
    if (!user) throw new Error('User not found');

    if (!user.ipAddresses) user.ipAddresses = [];
    if (clientIp && !user.ipAddresses.includes(clientIp)) {
      user.ipAddresses.push(clientIp);
    }
    user.lastIp = clientIp || user.lastIp;

    if (!user.fraudFlags) user.fraudFlags = [];
    let riskScore = 0;

    // Check 1: Multi-account on same IP
    if (clientIp && clientIp !== '127.0.0.1' && clientIp !== '::1') {
      const usersOnSameIp = data.users.filter(u => u.ipAddresses?.includes(clientIp));
      if (usersOnSameIp.length > 2) {
        if (!user.fraudFlags.includes('MULTI_ACCOUNT_SAME_IP')) {
          user.fraudFlags.push('MULTI_ACCOUNT_SAME_IP');
        }
        riskScore += 35;
      }
    }

    // Check 2: Rapid task submission check (< 3 seconds between tasks)
    if (user.lastTaskCompletedAt) {
      const diffMs = Date.now() - new Date(user.lastTaskCompletedAt).getTime();
      if (diffMs < 3000) {
        if (!user.fraudFlags.includes('RAPID_SUBMISSION_ATTEMPT')) {
          user.fraudFlags.push('RAPID_SUBMISSION_ATTEMPT');
        }
        riskScore += 25;
      }
    }

    user.riskScore = Math.min(riskScore + (user.fraudFlags.length * 15), 100);

    // Auto-suspend if risk score exceeds 80
    if (user.riskScore >= 80 && !user.isBlocked) {
      user.isBlocked = true;
      if (!user.fraudFlags.includes('AUTO_SUSPENDED_HIGH_RISK')) {
        user.fraudFlags.push('AUTO_SUSPENDED_HIGH_RISK');
      }
    }

    saveDatabase(data);
    return user;
  },

  // User Operations
  async getUserByTelegramId(telegramId: number): Promise<User | null> {
    const data = loadDatabase();
    return data.users.find(u => u.telegramId === telegramId) || null;
  },

  async getUserById(id: string): Promise<User | null> {
    const data = loadDatabase();
    return data.users.find(u => u.id === id) || null;
  },

  async getUserByReferralCode(code: string): Promise<User | null> {
    const data = loadDatabase();
    return data.users.find(u => u.referralCode === code) || null;
  },

  async upsertUser(userData: {
    telegramId: number;
    username?: string;
    firstName: string;
    lastName?: string;
    photoUrl?: string;
    referredByCode?: string;
    clientIp?: string;
  }): Promise<User> {
    const data = loadDatabase();
    let user = data.users.find(u => u.telegramId === userData.telegramId);

    if (user) {
      // Update basic details
      user.username = userData.username || user.username || `user_${userData.telegramId}`;
      user.firstName = userData.firstName || user.firstName;
      user.lastName = userData.lastName || user.lastName;
      user.photoUrl = userData.photoUrl || user.photoUrl;
      
      if (userData.clientIp) {
        await this.evaluateUserFraudRisk(user.id, userData.clientIp);
      } else {
        saveDatabase(data);
      }
      return user;
    }

    // Handle Referral logic
    let referredByTelegramId: number | undefined;
    if (userData.referredByCode) {
      const referrer = data.users.find(u => u.referralCode === userData.referredByCode);
      if (referrer && referrer.telegramId !== userData.telegramId) {
        referredByTelegramId = referrer.telegramId;
        referrer.referralsCount += 1;
        // Give referrer 50 Birr + 500 Points bonus!
        referrer.balance += 50;
        referrer.points += 500;

        data.transactions.unshift({
          id: `tx_ref_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          userId: referrer.id,
          type: 'referral_bonus',
          amount: 50,
          points: 500,
          description: `Referral bonus for inviting ${userData.firstName}`,
          status: 'completed',
          createdAt: new Date().toISOString()
        });
      }
    }

    const newUser: User = {
      id: `usr_${userData.telegramId}`,
      telegramId: userData.telegramId,
      username: userData.username || `user_${userData.telegramId}`,
      firstName: userData.firstName,
      lastName: userData.lastName,
      photoUrl: userData.photoUrl,
      balance: 100, // Welcome bonus of 100 Birr
      points: 1000, // Welcome bonus of 1000 Points
      referralsCount: 0,
      referredBy: referredByTelegramId,
      referralCode: `ref_${userData.telegramId}`,
      dailyStreak: 0,
      isBlocked: false,
      role: 'user',
      ipAddresses: userData.clientIp ? [userData.clientIp] : [],
      lastIp: userData.clientIp || '',
      riskScore: 0,
      fraudFlags: [],
      createdAt: new Date().toISOString()
    };

    data.users.push(newUser);

    data.transactions.unshift({
      id: `tx_welcome_${Date.now()}`,
      userId: newUser.id,
      type: 'task_reward',
      amount: 100,
      points: 1000,
      description: 'Welcome Bonus for joining NovaTask',
      status: 'completed',
      createdAt: new Date().toISOString()
    });

    saveDatabase(data);
    return newUser;
  },

  async updateUserCheckIn(userId: string): Promise<{ user: User; rewardBirr: number; rewardPoints: number }> {
    const data = loadDatabase();
    const user = data.users.find(u => u.id === userId);
    if (!user) throw new Error('User not found');
    if (user.isBlocked) throw new Error('Account suspended');

    const today = new Date().toISOString().split('T')[0];
    const lastCheckInDay = user.lastCheckIn ? user.lastCheckIn.split('T')[0] : null;

    if (lastCheckInDay === today) {
      throw new Error('Already checked in today!');
    }

    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    if (lastCheckInDay === yesterday) {
      user.dailyStreak += 1;
    } else {
      user.dailyStreak = 1; // reset streak if missed a day
    }

    const streakMultiplier = Math.min(user.dailyStreak, 7);
    const rewardBirr = 20 * streakMultiplier;
    const rewardPoints = 200 * streakMultiplier;

    user.balance += rewardBirr;
    user.points += rewardPoints;
    user.lastCheckIn = new Date().toISOString();

    data.transactions.unshift({
      id: `tx_checkin_${Date.now()}`,
      userId: user.id,
      type: 'daily_checkin',
      amount: rewardBirr,
      points: rewardPoints,
      description: `Daily Check-In Bonus (Day ${user.dailyStreak} Streak)`,
      status: 'completed',
      createdAt: new Date().toISOString()
    });

    saveDatabase(data);
    return { user, rewardBirr, rewardPoints };
  },

  // Tasks Operations
  async getTasks(): Promise<Task[]> {
    const data = loadDatabase();
    return data.tasks;
  },

  async getTaskById(taskId: string): Promise<Task | null> {
    const data = loadDatabase();
    return data.tasks.find(t => t.id === taskId) || null;
  },

  async createTask(taskData: Omit<Task, 'id' | 'completionsCount' | 'createdAt'>): Promise<Task> {
    const data = loadDatabase();
    const newTask: Task = {
      ...taskData,
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      completionsCount: 0,
      createdAt: new Date().toISOString()
    };
    data.tasks.unshift(newTask);
    saveDatabase(data);
    return newTask;
  },

  async updateTask(taskId: string, updates: Partial<Task>): Promise<Task | null> {
    const data = loadDatabase();
    const task = data.tasks.find(t => t.id === taskId);
    if (!task) return null;

    Object.assign(task, updates);
    saveDatabase(data);
    return task;
  },

  async deleteTask(taskId: string): Promise<boolean> {
    const data = loadDatabase();
    const index = data.tasks.findIndex(t => t.id === taskId);
    if (index === -1) return false;

    data.tasks.splice(index, 1);
    saveDatabase(data);
    return true;
  },

  // Completed Tasks Operations
  async getCompletedTasksForUser(userId: string): Promise<CompletedTask[]> {
    const data = loadDatabase();
    return data.completedTasks.filter(ct => ct.userId === userId);
  },

  async completeTask(userId: string, taskId: string): Promise<{ completedTask: CompletedTask; user: User }> {
    const data = loadDatabase();
    const user = data.users.find(u => u.id === userId);
    if (!user) throw new Error('User not found');
    if (user.isBlocked) throw new Error('Account is suspended due to security guidelines');

    const task = data.tasks.find(t => t.id === taskId);
    if (!task) throw new Error('Task not found');
    if (task.status !== 'active') throw new Error('Task is inactive or expired');

    // Anti-fraud rate limit check
    if (user.lastTaskCompletedAt) {
      const timeSinceLastMs = Date.now() - new Date(user.lastTaskCompletedAt).getTime();
      if (timeSinceLastMs < 3000) {
        throw new Error('Please wait a few seconds before completing another task.');
      }
    }

    // Anti-fraud duplicate completion check
    const existing = data.completedTasks.find(ct => ct.userId === userId && ct.taskId === taskId);
    if (existing) {
      throw new Error('Task already completed by this account');
    }

    const completedRecord: CompletedTask = {
      id: `ct_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      userId: user.id,
      telegramId: user.telegramId,
      taskId: task.id,
      taskTitle: task.title,
      rewardBirr: task.rewardBirr,
      rewardPoints: task.rewardPoints,
      completedAt: new Date().toISOString()
    };

    task.completionsCount += 1;
    user.balance += task.rewardBirr;
    user.points += task.rewardPoints;
    user.lastTaskCompletedAt = new Date().toISOString();

    data.completedTasks.unshift(completedRecord);

    data.transactions.unshift({
      id: `tx_task_${Date.now()}`,
      userId: user.id,
      type: 'task_reward',
      amount: task.rewardBirr,
      points: task.rewardPoints,
      description: `Task reward: ${task.title}`,
      status: 'completed',
      createdAt: new Date().toISOString()
    });

    saveDatabase(data);
    return { completedTask: completedRecord, user };
  },

  // Task Submissions for Admin Approval Fallback (Social proof: YouTube, Instagram, Facebook, manual links)
  async createTaskSubmission(submissionData: {
    userId: string;
    taskId: string;
    proofType: 'social_handle' | 'screenshot_url' | 'text_proof' | 'telegram_auto';
    proofData: string;
  }): Promise<TaskSubmission> {
    const data = loadDatabase();
    const user = data.users.find(u => u.id === submissionData.userId);
    if (!user) throw new Error('User not found');
    if (user.isBlocked) throw new Error('Account suspended');

    const task = data.tasks.find(t => t.id === submissionData.taskId);
    if (!task) throw new Error('Task not found');

    // Check if task already completed
    const existingCompleted = data.completedTasks.find(ct => ct.userId === user.id && ct.taskId === task.id);
    if (existingCompleted) {
      throw new Error('You have already completed this task and received your reward!');
    }

    // Check if there's already a pending submission
    const existingPending = data.taskSubmissions.find(s => s.userId === user.id && s.taskId === task.id && s.status === 'pending');
    if (existingPending) {
      throw new Error('You already have a pending verification for this task. Admin review in progress.');
    }

    const newSubmission: TaskSubmission = {
      id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      userId: user.id,
      telegramId: user.telegramId,
      username: user.username,
      taskId: task.id,
      taskTitle: task.title,
      category: task.category,
      platform: task.platform,
      verificationType: task.verificationType,
      proofType: submissionData.proofType,
      proofData: submissionData.proofData,
      rewardBirr: task.rewardBirr,
      rewardPoints: task.rewardPoints,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    data.taskSubmissions.unshift(newSubmission);
    saveDatabase(data);
    return newSubmission;
  },

  async getUserTaskSubmissions(userId: string): Promise<TaskSubmission[]> {
    const data = loadDatabase();
    return data.taskSubmissions.filter(s => s.userId === userId);
  },

  async getPendingTaskSubmissions(): Promise<TaskSubmission[]> {
    const data = loadDatabase();
    return data.taskSubmissions.filter(s => s.status === 'pending');
  },

  async getAllTaskSubmissions(): Promise<TaskSubmission[]> {
    const data = loadDatabase();
    return data.taskSubmissions;
  },

  async processTaskSubmission(submissionId: string, status: 'approved' | 'rejected', adminNote?: string): Promise<{ submission: TaskSubmission; user?: User }> {
    const data = loadDatabase();
    const submission = data.taskSubmissions.find(s => s.id === submissionId);
    if (!submission) throw new Error('Task submission not found');

    if (submission.status !== 'pending') {
      throw new Error(`Submission is already ${submission.status}`);
    }

    submission.status = status;
    submission.adminNote = adminNote;
    submission.updatedAt = new Date().toISOString();

    let user: User | undefined;

    if (status === 'approved') {
      // Complete task and reward user!
      const result = await this.completeTask(submission.userId, submission.taskId);
      user = result.user;
    }

    saveDatabase(data);
    return { submission, user };
  },

  // Withdrawal Operations
  async getWithdrawalsForUser(userId: string): Promise<Withdrawal[]> {
    const data = loadDatabase();
    return data.withdrawals.filter(w => w.userId === userId);
  },

  async createWithdrawal(withdrawalData: {
    userId: string;
    amount: number;
    method: 'telebirr' | 'cbe_birr' | 'bank_transfer';
    accountNumber: string;
    accountName: string;
  }): Promise<Withdrawal> {
    const data = loadDatabase();
    const user = data.users.find(u => u.id === withdrawalData.userId);
    if (!user) throw new Error('User not found');
    if (user.isBlocked) throw new Error('Account suspended due to security guidelines');

    if (withdrawalData.amount < 2000) {
      throw new Error('Minimum withdrawal amount is 2,000 Birr');
    }

    if (user.balance < withdrawalData.amount) {
      throw new Error(`Insufficient balance. Your current balance is ${user.balance} Birr.`);
    }

    // Deduct user balance immediately
    user.balance -= withdrawalData.amount;

    const newWithdrawal: Withdrawal = {
      id: `wth_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      userId: user.id,
      telegramId: user.telegramId,
      username: user.username,
      amount: withdrawalData.amount,
      method: withdrawalData.method,
      accountNumber: withdrawalData.accountNumber,
      accountName: withdrawalData.accountName,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    data.withdrawals.unshift(newWithdrawal);

    data.transactions.unshift({
      id: `tx_wth_${Date.now()}`,
      userId: user.id,
      type: 'withdrawal',
      amount: -withdrawalData.amount,
      points: 0,
      description: `Withdrawal request via ${withdrawalData.method.toUpperCase()} (${withdrawalData.accountNumber})`,
      status: 'pending',
      createdAt: new Date().toISOString()
    });

    saveDatabase(data);
    return newWithdrawal;
  },

  async processWithdrawal(withdrawalId: string, status: 'approved' | 'rejected', adminNote?: string): Promise<Withdrawal> {
    const data = loadDatabase();
    const withdrawal = data.withdrawals.find(w => w.id === withdrawalId);
    if (!withdrawal) throw new Error('Withdrawal request not found');

    if (withdrawal.status !== 'pending') {
      throw new Error(`Withdrawal request is already ${withdrawal.status}`);
    }

    withdrawal.status = status;
    withdrawal.adminNote = adminNote;
    withdrawal.updatedAt = new Date().toISOString();

    const user = data.users.find(u => u.id === withdrawal.userId);

    if (status === 'rejected') {
      // Refund user balance if rejected
      if (user) {
        user.balance += withdrawal.amount;
      }
      const tx = data.transactions.find(t => t.description.includes(withdrawal.accountNumber) && t.status === 'pending');
      if (tx) {
        tx.status = 'rejected';
      }
    } else if (status === 'approved') {
      const tx = data.transactions.find(t => t.description.includes(withdrawal.accountNumber) && t.status === 'pending');
      if (tx) {
        tx.status = 'completed';
      }
    }

    saveDatabase(data);
    return withdrawal;
  },

  // Admin & User Management
  async getAllUsers(): Promise<User[]> {
    const data = loadDatabase();
    return data.users;
  },

  async getAllWithdrawals(): Promise<Withdrawal[]> {
    const data = loadDatabase();
    return data.withdrawals;
  },

  async toggleUserBlockStatus(userId: string, isBlocked: boolean): Promise<User> {
    const data = loadDatabase();
    const user = data.users.find(u => u.id === userId);
    if (!user) throw new Error('User not found');

    user.isBlocked = isBlocked;
    saveDatabase(data);
    return user;
  },

  async updateUserBalance(userId: string, newBalanceBirr: number): Promise<User> {
    const data = loadDatabase();
    const user = data.users.find(u => u.id === userId);
    if (!user) throw new Error('User not found');

    user.balance = newBalanceBirr;
    saveDatabase(data);
    return user;
  },

  async getTransactionsForUser(userId: string): Promise<Transaction[]> {
    const data = loadDatabase();
    return data.transactions.filter(t => t.userId === userId);
  },

  async getAdminAnalytics(): Promise<AdminAnalytics> {
    const data = loadDatabase();
    const totalUsers = data.users.length;
    const activeUsers24h = data.users.filter(u => {
      const date = new Date(u.createdAt).getTime();
      return Date.now() - date < 24 * 60 * 60 * 1000;
    }).length || totalUsers;

    const completedTasksCount = data.completedTasks.length;
    
    const totalRewardsDistributedBirr = data.transactions
      .filter(t => t.amount > 0 && t.status === 'completed')
      .reduce((sum, t) => sum + t.amount, 0);

    const pendingWithdrawalsList = data.withdrawals.filter(w => w.status === 'pending');
    const totalPendingWithdrawalsBirr = pendingWithdrawalsList.reduce((sum, w) => sum + w.amount, 0);
    const pendingWithdrawalsCount = pendingWithdrawalsList.length;

    const pendingSubmissionsCount = data.taskSubmissions.filter(s => s.status === 'pending').length;
    const blockedUsersCount = data.users.filter(u => u.isBlocked).length;
    const flaggedUsersCount = data.users.filter(u => (u.riskScore && u.riskScore > 30) || (u.fraudFlags && u.fraudFlags.length > 0)).length;

    return {
      totalUsers,
      activeUsers24h: Math.max(activeUsers24h, 1),
      completedTasksCount,
      totalRewardsDistributedBirr,
      totalPendingWithdrawalsBirr,
      pendingWithdrawalsCount,
      pendingSubmissionsCount,
      blockedUsersCount,
      flaggedUsersCount
    };
  },

  // System Settings & Broadcasts
  async getSystemSettings(): Promise<SystemSettings> {
    const data = loadDatabase();
    if (!data.systemSettings) {
      data.systemSettings = {
        minWithdrawalBirr: 2000,
        maintenanceMode: false,
        botUsername: '@EtNovaTasksbot',
        botTokenConfigured: true,
        systemNotice: 'NovaTask Official Platform active and fully operational.',
        autoApprovalThreshold: 150
      };
      saveDatabase(data);
    }
    return data.systemSettings;
  },

  async updateSystemSettings(updates: Partial<SystemSettings>): Promise<SystemSettings> {
    const data = loadDatabase();
    const current = await this.getSystemSettings();
    data.systemSettings = { ...current, ...updates };
    saveDatabase(data);
    return data.systemSettings;
  },

  async getBroadcasts(): Promise<BroadcastNotification[]> {
    const data = loadDatabase();
    return data.broadcasts || [];
  },

  async createBroadcast(broadcastData: {
    title: string;
    message: string;
    targetAudience: 'all' | 'active' | 'blocked';
  }): Promise<BroadcastNotification> {
    const data = loadDatabase();
    if (!data.broadcasts) data.broadcasts = [];

    const recipients = data.users.filter(u => {
      if (broadcastData.targetAudience === 'active') return !u.isBlocked;
      if (broadcastData.targetAudience === 'blocked') return u.isBlocked;
      return true;
    });

    const newBroadcast: BroadcastNotification = {
      id: `bc_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      title: broadcastData.title,
      message: broadcastData.message,
      targetAudience: broadcastData.targetAudience,
      sentAt: new Date().toISOString(),
      recipientCount: recipients.length
    };

    data.broadcasts.unshift(newBroadcast);
    saveDatabase(data);
    return newBroadcast;
  },

  // Live Withdrawal Feed & Statistics
  async getRecentWithdrawalsFeed() {
    const data = loadDatabase();
    const realWithdrawals = data.withdrawals || [];

    // Helper formatting functions
    const maskNameStr = (name: string) => {
      if (!name) return 'A**l';
      const clean = name.trim();
      const parts = clean.split(/\s+/);
      return parts.map(p => {
        if (p.length <= 1) return p;
        if (p.length === 2) return p[0] + '*';
        return `${p[0]}${'*'.repeat(p.length - 2)}${p[p.length - 1]}`;
      }).join(' ');
    };

    const maskPhoneStr = (phone: string) => {
      if (!phone) return '09******20';
      let digits = phone.replace(/\D/g, '');
      if (digits.startsWith('251')) digits = '0' + digits.slice(3);
      if (!digits.startsWith('0')) digits = '0' + digits;
      if (digits.length < 8) return '09******20';
      return `${digits.slice(0, 2)}******${digits.slice(-2)}`;
    };

    const maskAmountStr = (amt: number) => {
      const num = Math.round(amt).toString();
      if (num.length <= 1) return `${num} Birr`;
      return `${num[0]}${'*'.repeat(num.length - 1)} Birr`;
    };

    const maskBankStr = (method: string, name?: string) => {
      const str = (name || method || '').toLowerCase();
      if (str.includes('telebirr')) return 'T******r';
      if (str.includes('cbe birr') || str.includes('cbe_birr')) return 'C** Birr';
      if (str.includes('commercial bank') || str.includes('cbe')) return 'C******** Bank';
      if (str.includes('awash')) return 'A**** Bank';
      if (str.includes('dashen')) return 'D****n Bank';
      if (str.includes('abyssinia')) return 'A*******a Bank';
      if (str.includes('oromia')) return 'O****a Bank';
      return 'C** Bank';
    };

    const getTimeAgoStr = (ms: number) => {
      const mins = Math.floor(ms / (60 * 1000));
      if (mins < 1) return 'Just now';
      if (mins < 60) return `${mins} mins ago`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return `${hours} hr${hours > 1 ? 's' : ''} ago`;
      const days = Math.floor(hours / 24);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    };

    const now = Date.now();

    // Map real database withdrawals
    const formattedReal = realWithdrawals.map(wth => {
      const user = data.users.find(u => u.id === wth.userId || u.telegramId === wth.telegramId);
      const rawName = wth.accountName || (user ? `${user.firstName} ${user.lastName || ''}`.trim() : 'User');
      const ts = new Date(wth.createdAt).getTime() || now;
      return {
        id: wth.id,
        rawName,
        maskedName: maskNameStr(rawName),
        rawPhone: wth.accountNumber,
        maskedPhone: maskPhoneStr(wth.accountNumber),
        rawAmount: wth.amount,
        maskedAmount: maskAmountStr(wth.amount),
        rawBank: wth.method === 'telebirr' ? 'Telebirr' : wth.method === 'cbe_birr' ? 'CBE Birr' : 'Commercial Bank of Ethiopia',
        maskedBank: maskBankStr(wth.method, wth.accountName),
        method: wth.method,
        timeAgo: getTimeAgoStr(now - ts),
        status: wth.status,
        timestamp: ts,
        isSampleData: false
      };
    });

    // Sample Ethiopian withdrawal generator to guarantee 90+ records
    const sampleEthiopianNames = [
      'Abel Tefera', 'Mohammed Seid', 'Tigist Alemayehu', 'Biniam Worku', 'Genet Kebede',
      'Dawit Hailu', 'Kidist Tadesse', 'Solomon Bekele', 'Bethlehem Girma', 'Tariku Mulatu',
      'Yonas Assefa', 'Tsion Demisse', 'Meron Tesfaye', 'Halima Hussein', 'Robel Berhane',
      'Chaltu Tufa', 'Kassahun Belay', 'Henok Mulugeta', 'Fikirte Eshetu', 'Ermias Desta',
      'Rediet Negash', 'Sifan Lemma', 'Mikiyas Fikru', 'Abebe Bikila', 'Hiwot Haile'
    ];

    const sampleBanks = [
      { method: 'telebirr' as const, name: 'Telebirr', mask: 'T******r' },
      { method: 'cbe_birr' as const, name: 'CBE Birr', mask: 'C** Birr' },
      { method: 'bank_transfer' as const, name: 'Commercial Bank of Ethiopia', mask: 'C******** Bank' },
      { method: 'bank_transfer' as const, name: 'Awash Bank', mask: 'A**** Bank' },
      { method: 'bank_transfer' as const, name: 'Dashen Bank', mask: 'D****n Bank' },
      { method: 'bank_transfer' as const, name: 'Abyssinia Bank', mask: 'A*******a Bank' }
    ];

    const sampleAmounts = [2000, 2500, 3000, 3500, 4000, 4500, 5000, 6000, 7500, 10000];

    const sampleRecords: typeof formattedReal = [];
    const targetCount = 95;
    const itemsNeeded = Math.max(0, targetCount - formattedReal.length);

    for (let i = 0; i < itemsNeeded; i++) {
      const name = sampleEthiopianNames[i % sampleEthiopianNames.length];
      const bank = sampleBanks[i % sampleBanks.length];
      const amt = sampleAmounts[i % sampleAmounts.length];
      // Random spread over the past 48 hours
      const minutesAgo = Math.floor(i * 28 + Math.random() * 15);
      const ts = now - minutesAgo * 60 * 1000;
      const phoneNum = `09${10000000 + Math.floor(Math.random() * 89999999)}`;

      sampleRecords.push({
        id: `sample_wth_${i}_${ts}`,
        rawName: name,
        maskedName: maskNameStr(name),
        rawPhone: phoneNum,
        maskedPhone: maskPhoneStr(phoneNum),
        rawAmount: amt,
        maskedAmount: maskAmountStr(amt),
        rawBank: bank.name,
        maskedBank: bank.mask,
        method: bank.method,
        timeAgo: getTimeAgoStr(now - ts),
        status: 'approved',
        timestamp: ts,
        isSampleData: true
      });
    }

    const combinedList = [...formattedReal, ...sampleRecords].sort((a, b) => b.timestamp - a.timestamp);

    // Compute stats
    const totalCount = 1420 + formattedReal.length;
    const totalAmountBirr = combinedList.reduce((sum, item) => sum + item.rawAmount, 0) * 12;
    const todayCount = combinedList.filter(item => now - item.timestamp < 24 * 60 * 60 * 1000).length;

    const methodCounts: Record<string, number> = { telebirr: 0, cbe_birr: 0, bank_transfer: 0 };
    combinedList.forEach(item => {
      if (item.method in methodCounts) methodCounts[item.method]++;
      else methodCounts.bank_transfer++;
    });

    const popularMethods = [
      { method: 'telebirr', label: 'Telebirr', count: methodCounts.telebirr, percentage: Math.round((methodCounts.telebirr / combinedList.length) * 100) },
      { method: 'bank_transfer', label: 'Bank Transfer (CBE/Awash)', count: methodCounts.bank_transfer, percentage: Math.round((methodCounts.bank_transfer / combinedList.length) * 100) },
      { method: 'cbe_birr', label: 'CBE Birr', count: methodCounts.cbe_birr, percentage: Math.round((methodCounts.cbe_birr / combinedList.length) * 100) }
    ];

    return {
      success: true,
      withdrawals: combinedList,
      stats: {
        totalCount,
        totalAmountBirr,
        todayCount,
        popularMethods
      },
      hasRealData: formattedReal.length > 0
    };
  },

  // Live Top Leaderboard
  async getLeaderboardRankings() {
    const data = loadDatabase();
    const maskNameStr = (name: string) => {
      if (!name) return 'A**l';
      const clean = name.trim();
      const parts = clean.split(/\s+/);
      return parts.map(p => {
        if (p.length <= 1) return p;
        if (p.length === 2) return p[0] + '*';
        return `${p[0]}${'*'.repeat(p.length - 2)}${p[p.length - 1]}`;
      }).join(' ');
    };

    const maskUsernameStr = (uname?: string) => {
      if (!uname) return '@u***r';
      const clean = uname.replace('@', '');
      if (clean.length <= 2) return `@${clean[0]}*`;
      return `@${clean[0]}${'*'.repeat(clean.length - 2)}${clean[clean.length - 1]}`;
    };

    const realUsers = [...data.users].sort((a, b) => b.referralsCount - a.referralsCount || b.balance - a.balance);

    const defaultTopReferrers = [
      { name: 'Abel Tefera', username: 'abel_t', referrals: 450, earned: 22500, avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80' },
      { name: 'Biniam Worku', username: 'biniam_w', referrals: 382, earned: 19100, avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80' },
      { name: 'Chaltu Tufa', username: 'chaltu_t', referrals: 315, earned: 15750, avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80' },
      { name: 'Dawit Hailu', username: 'dawit_h', referrals: 270, earned: 13500, avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80' },
      { name: 'Ermias Desta', username: 'ermias_d', referrals: 210, earned: 10500, avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80' },
      { name: 'Fikirte Eshetu', username: 'fikirte_e', referrals: 185, earned: 9250, avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80' },
      { name: 'Genet Kebede', username: 'genet_k', referrals: 160, earned: 8000, avatar: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=150&auto=format&fit=crop&q=80' },
      { name: 'Henok Mulugeta', username: 'henok_m', referrals: 142, earned: 7100, avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80' },
      { name: 'Halima Hussein', username: 'halima_h', referrals: 128, earned: 6400, avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80' },
      { name: 'Kidist Tadesse', username: 'kidist_t', referrals: 110, earned: 5500, avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80' }
    ];

    const leaderboard: Array<{
      rank: number;
      rawName: string;
      maskedName: string;
      rawUsername: string;
      maskedUsername: string;
      photoUrl: string;
      referralsCount: number;
      totalEarnedBirr: number;
      isSampleData: boolean;
    }> = [];

    // First process real top users
    realUsers.forEach((u, idx) => {
      const rawName = `${u.firstName} ${u.lastName || ''}`.trim() || 'User';
      leaderboard.push({
        rank: idx + 1,
        rawName,
        maskedName: maskNameStr(rawName),
        rawUsername: u.username ? `@${u.username}` : `@user_${u.telegramId}`,
        maskedUsername: maskUsernameStr(u.username),
        photoUrl: u.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        referralsCount: Math.max(u.referralsCount, 0),
        totalEarnedBirr: Math.max(u.referralsCount * 50, u.balance),
        isSampleData: false
      });
    });

    // Supplement with sample Ethiopian referrers if fewer than 10
    if (leaderboard.length < 10) {
      defaultTopReferrers.slice(leaderboard.length).forEach((sample) => {
        const rank = leaderboard.length + 1;
        leaderboard.push({
          rank,
          rawName: sample.name,
          maskedName: maskNameStr(sample.name),
          rawUsername: `@${sample.username}`,
          maskedUsername: maskUsernameStr(sample.username),
          photoUrl: sample.avatar,
          referralsCount: sample.referrals,
          totalEarnedBirr: sample.earned,
          isSampleData: true
        });
      });
    }

    // Ensure sorted by referrals
    leaderboard.sort((a, b) => b.referralsCount - a.referralsCount || b.totalEarnedBirr - a.totalEarnedBirr);
    leaderboard.forEach((item, idx) => {
      item.rank = idx + 1;
    });

    // Top 3 Podium layout
    const top3 = {
      rank1: leaderboard[0] || null,
      rank2: leaderboard[1] || null,
      rank3: leaderboard[2] || null
    };

    return {
      success: true,
      top3,
      leaderboard: leaderboard.slice(0, 20)
    };
  }
};
