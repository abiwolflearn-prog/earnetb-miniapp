import fs from 'fs';
import path from 'path';
import { User, Task, CompletedTask, Withdrawal, Transaction, AdminAnalytics, TaskSubmission } from '../src/types';
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
}

// In-memory cache synced with JSON disk storage & MongoDB Atlas
let dbCache: DatabaseSchema = {
  users: [],
  tasks: [...INITIAL_TASKS],
  completedTasks: [],
  taskSubmissions: [],
  withdrawals: [],
  transactions: []
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
  }
};
