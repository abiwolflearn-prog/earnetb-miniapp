import dotenv from "dotenv";
dotenv.config();


import express from 'express';
import path from 'path';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import { db, verifyTelegramChannelMembership, initDatabaseFromMongo } from './server/db';
import { validateTelegramInitData, generateAdminToken, requireAdminAuth, AuthenticatedRequest } from './server/auth';
import { handleBotCommand } from './server/bot';
import { TelegramUser } from './src/types';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const PORT = 3000;

async function startServer() {
  // Initialize and hydrate database from MongoDB Atlas if MONGODB_URI is provided
  await initDatabaseFromMongo();

  const app = express();

  app.use(cors());
  app.use(express.json());

  // Simple in-memory rate limiting map for anti-abuse
  const rateLimitMap = new Map<string, number[]>();

  const rateLimiter = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const ip = req.ip || 'unknown';
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute
    const maxRequests = 100;

    const timestamps = rateLimitMap.get(ip) || [];
    const validTimestamps = timestamps.filter(t => now - t < windowMs);

    if (validTimestamps.length >= maxRequests) {
      return res.status(429).json({ error: 'Too many requests. Please try again in a minute.' });
    }

    validTimestamps.push(now);
    rateLimitMap.set(ip, validTimestamps);
    next();
  };

  app.use('/api/', rateLimiter);

  // Helper middleware to extract Telegram user from initData header
  const extractTelegramUser = async (req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) => {
    const initDataHeader = (req.headers['x-telegram-init-data'] as string) || '';
    const validation = validateTelegramInitData(initDataHeader);

    if (!validation.isValid || !validation.user) {
      return res.status(401).json({ error: 'Invalid or missing Telegram initData authentication' });
    }

    req.telegramUser = validation.user;
    next();
  };

  // =====================================
  // PUBLIC & TELEGRAM AUTH API ROUTES
  // =====================================

  // 1. Authenticate Telegram User & Sync Profile
  app.post('/api/auth/telegram', async (req, res) => {
    try {
      const { initDataRaw, referredByCode } = req.body;
      const validation = validateTelegramInitData(initDataRaw);

      if (!validation.isValid || !validation.user) {
        return res.status(400).json({ error: 'Telegram authentication failed: Invalid signature' });
      }

      const clientIp = (req.headers['x-forwarded-for'] as string) || req.ip || '';
      const tgUser: TelegramUser = validation.user;
      const user = await db.upsertUser({
        telegramId: tgUser.id,
        firstName: tgUser.first_name,
        lastName: tgUser.last_name,
        username: tgUser.username,
        photoUrl: tgUser.photo_url,
        referredByCode,
        clientIp
      });

      if (user.isBlocked) {
        return res.status(403).json({ error: 'Account suspended due to security violations.' });
      }

      const completedTasks = await db.getCompletedTasksForUser(user.id);
      const completedTaskIds = completedTasks.map(ct => ct.taskId);
      const submissions = await db.getUserTaskSubmissions(user.id);

      return res.json({
        user,
        completedTaskIds,
        submissions
      });
    } catch (err: any) {
      console.error('Error in /api/auth/telegram:', err);
      return res.status(500).json({ error: err.message || 'Server error' });
    }
  });

  // 2. Get Current User Profile & Stats
  app.get('/api/user/me', extractTelegramUser, async (req: AuthenticatedRequest, res) => {
    try {
      const tgUser = req.telegramUser!;
      const user = await db.getUserByTelegramId(tgUser.id);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (user.isBlocked) {
        return res.status(403).json({ error: 'Account suspended.' });
      }

      const completedTasks = await db.getCompletedTasksForUser(user.id);
      const completedTaskIds = completedTasks.map(ct => ct.taskId);
      const submissions = await db.getUserTaskSubmissions(user.id);

      return res.json({
        user,
        completedTaskIds,
        submissions
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // 3. Process Daily Check-in Streak Reward
  app.post('/api/user/checkin', extractTelegramUser, async (req: AuthenticatedRequest, res) => {
    try {
      const tgUser = req.telegramUser!;
      const user = await db.getUserByTelegramId(tgUser.id);
      if (!user) return res.status(404).json({ error: 'User not found' });

      const result = await db.updateUserCheckIn(user.id);
      return res.json(result);
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Daily check-in failed' });
    }
  });

  // 4. Get Tasks List with completion status
  app.get('/api/tasks', extractTelegramUser, async (req: AuthenticatedRequest, res) => {
    try {
      const tgUser = req.telegramUser!;
      const user = await db.getUserByTelegramId(tgUser.id);
      if (!user) return res.status(404).json({ error: 'User not found' });

      const tasks = await db.getTasks();
      const completedRecords = await db.getCompletedTasksForUser(user.id);
      const completedTaskIds = new Set(completedRecords.map(ct => ct.taskId));
      const submissions = await db.getUserTaskSubmissions(user.id);
      const submissionsMap = new Map(submissions.map(s => [s.taskId, s.status]));

      const enrichedTasks = tasks.map(task => ({
        ...task,
        isCompleted: completedTaskIds.has(task.id),
        submissionStatus: submissionsMap.get(task.id) || null
      }));

      return res.json({ tasks: enrichedTasks, submissions });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // 5. Verify & Complete a Task (Real Telegram Bot API Membership Check included)
  app.post('/api/tasks/complete', extractTelegramUser, async (req: AuthenticatedRequest, res) => {
    try {
      const tgUser = req.telegramUser!;
      const user = await db.getUserByTelegramId(tgUser.id);
      if (!user) return res.status(404).json({ error: 'User not found' });

      const { taskId, quizAnswers } = req.body;
      const task = await db.getTaskById(taskId);

      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }

      // 1. Telegram Channel Join Verification via Bot API
      if (task.verificationType === 'channel_join') {
        const targetChannel = task.channelUsername || task.targetUrl || '@NovaTaskOfficial';
        const verification = await verifyTelegramChannelMembership(user.telegramId, targetChannel);
        
        if (!verification.isMember) {
          return res.status(400).json({ 
            error: verification.message || 'Membership verification failed. Please join the channel first!' 
          });
        }
      }

      // 2. Admin Check tasks MUST use submit-proof endpoint
      if (task.verificationType === 'admin_check') {
        return res.status(400).json({
          error: 'This task requires social proof submission (handle/link/screenshot) for admin verification.'
        });
      }

      // 3. Quiz verification check if quiz task
      if (task.verificationType === 'quiz' && task.quizQuestions) {
        if (!quizAnswers || !Array.isArray(quizAnswers)) {
          return res.status(400).json({ error: 'Quiz answers are required' });
        }

        let isAllCorrect = true;
        task.quizQuestions.forEach((q, idx) => {
          if (quizAnswers[idx] !== q.correctIndex) {
            isAllCorrect = false;
          }
        });

        if (!isAllCorrect) {
          return res.status(400).json({ error: 'Incorrect quiz answers. Please try again!' });
        }
      }

      const result = await db.completeTask(user.id, taskId);
      return res.json(result);
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to complete task' });
    }
  });

  // 6. Submit Proof for Admin Review (YouTube, Instagram, Facebook, Custom Proof)
  app.post('/api/tasks/submit-proof', extractTelegramUser, async (req: AuthenticatedRequest, res) => {
    try {
      const tgUser = req.telegramUser!;
      const user = await db.getUserByTelegramId(tgUser.id);
      if (!user) return res.status(404).json({ error: 'User not found' });

      const { taskId, proofType, proofData } = req.body;
      if (!taskId || !proofData) {
        return res.status(400).json({ error: 'Task ID and proof details (username, profile link, or screenshot proof) are required.' });
      }

      const submission = await db.createTaskSubmission({
        userId: user.id,
        taskId,
        proofType: proofType || 'social_handle',
        proofData: String(proofData).trim()
      });

      return res.json({
        success: true,
        submission,
        message: 'Proof submitted successfully! Your submission is now under admin review.'
      });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Proof submission failed' });
    }
  });

  // 7. Get User Submissions History
  app.get('/api/tasks/submissions', extractTelegramUser, async (req: AuthenticatedRequest, res) => {
    try {
      const tgUser = req.telegramUser!;
      const user = await db.getUserByTelegramId(tgUser.id);
      if (!user) return res.status(404).json({ error: 'User not found' });

      const submissions = await db.getUserTaskSubmissions(user.id);
      return res.json({ submissions });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // 8. Get User Withdrawals & Transaction History
  app.get('/api/withdrawals', extractTelegramUser, async (req: AuthenticatedRequest, res) => {
    try {
      const tgUser = req.telegramUser!;
      const user = await db.getUserByTelegramId(tgUser.id);
      if (!user) return res.status(404).json({ error: 'User not found' });

      const withdrawals = await db.getWithdrawalsForUser(user.id);
      const transactions = await db.getTransactionsForUser(user.id);

      return res.json({ withdrawals, transactions });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // 9. Request Withdrawal
  app.post('/api/withdrawals', extractTelegramUser, async (req: AuthenticatedRequest, res) => {
    try {
      const tgUser = req.telegramUser!;
      const user = await db.getUserByTelegramId(tgUser.id);
      if (!user) return res.status(404).json({ error: 'User not found' });

      const { amount, method, accountNumber, accountName } = req.body;

      if (!amount || !method || !accountNumber || !accountName) {
        return res.status(400).json({ error: 'All withdrawal details (Amount, Method, Account Number, Account Name) are required.' });
      }

      const withdrawal = await db.createWithdrawal({
        userId: user.id,
        amount: Number(amount),
        method,
        accountNumber,
        accountName
      });

      const updatedUser = await db.getUserById(user.id);

      return res.json({
        success: true,
        withdrawal,
        user: updatedUser
      });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Withdrawal request failed' });
    }
  });

  // 10. Get Referrals Info & Leaderboard
  app.get('/api/referrals', extractTelegramUser, async (req: AuthenticatedRequest, res) => {
    try {
      const tgUser = req.telegramUser!;
      const user = await db.getUserByTelegramId(tgUser.id);
      if (!user) return res.status(404).json({ error: 'User not found' });

      const allUsers = await db.getAllUsers();
      
      // Invited friends
      const friends = allUsers
        .filter(u => u.referredBy === user.telegramId)
        .map(u => ({
          telegramId: u.telegramId,
          firstName: u.firstName,
          username: u.username,
          joinedAt: u.createdAt,
          earnedForUserBirr: 50
        }));

      // Top Referrers Leaderboard
      const leaderboard = [...allUsers]
        .sort((a, b) => b.referralsCount - a.referralsCount)
        .slice(0, 10)
        .map((u, idx) => ({
          rank: idx + 1,
          firstName: u.firstName,
          username: u.username,
          photoUrl: u.photoUrl,
          referralsCount: u.referralsCount,
          totalEarnedBirr: u.referralsCount * 50
        }));

      return res.json({
        referralCode: user.referralCode,
        referralsCount: user.referralsCount,
        totalEarnedBirr: user.referralsCount * 50,
        friends,
        leaderboard
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // 11. GET /api/withdrawals/recent - Live Recent Withdrawals Stream (80+ records)
  app.get('/api/withdrawals/recent', async (req, res) => {
    try {
      const feedData = await db.getRecentWithdrawalsFeed();
      return res.json(feedData);
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to fetch recent withdrawals feed' });
    }
  });

  // 12. GET /api/leaderboard - Top Referrers Leaderboard with Podium Layout
  app.get('/api/leaderboard', async (req, res) => {
    try {
      const leaderboardData = await db.getLeaderboardRankings();
      return res.json(leaderboardData);
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to fetch leaderboard' });
    }
  });

  // =====================================
  // BOT COMMAND & WEBHOOK ROUTES
  // =====================================

  app.post('/api/bot/command', async (req, res) => {
    try {
      const { command, user } = req.body;
      const tgUser: TelegramUser = user || {
        id: 987654321,
        first_name: 'Abebe',
        username: 'abebe_novatask'
      };

      const response = await handleBotCommand(command || '/start', tgUser);
      return res.json(response);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/bot/webhook', async (req, res) => {
    try {
      const body = req.body;
      if (body?.message) {
        const text = body.message.text || '';
        const tgUser = body.message.from;
        if (text.startsWith('/') && tgUser) {
          await handleBotCommand(text, tgUser);
        }
      }
      return res.json({ ok: true });
    } catch (err: any) {
      return res.json({ ok: true });
    }
  });

  // =====================================
  // ADMIN DASHBOARD API ROUTES
  // =====================================

  // Admin Login
  app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
      const token = generateAdminToken('admin');
      return res.json({ token, success: true });
    } else {
      return res.status(401).json({ error: 'Invalid admin password' });
    }
  });

  // Admin Analytics Overview
  app.get('/api/admin/stats', requireAdminAuth, async (req, res) => {
    try {
      const analytics = await db.getAdminAnalytics();
      return res.json({ analytics });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Manage Pending Task Submissions (Admin Approval Fallback)
  app.get('/api/admin/submissions', requireAdminAuth, async (req, res) => {
    try {
      const submissions = await db.getAllTaskSubmissions();
      return res.json({ submissions });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/admin/submissions/:id', requireAdminAuth, async (req, res) => {
    try {
      const submissionId = req.params.id;
      const { status, adminNote } = req.body;

      if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'Status must be approved or rejected' });
      }

      const result = await db.processTaskSubmission(submissionId, status, adminNote);
      return res.json(result);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  });

  // Manage Tasks (Create, Edit, Delete)
  app.post('/api/admin/tasks', requireAdminAuth, async (req, res) => {
    try {
      const taskData = req.body;
      const newTask = await db.createTask(taskData);
      return res.json({ task: newTask });
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  });

  app.put('/api/admin/tasks/:id', requireAdminAuth, async (req, res) => {
    try {
      const taskId = req.params.id;
      const updates = req.body;
      const updatedTask = await db.updateTask(taskId, updates);
      if (!updatedTask) return res.status(404).json({ error: 'Task not found' });
      return res.json({ task: updatedTask });
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  });

  app.delete('/api/admin/tasks/:id', requireAdminAuth, async (req, res) => {
    try {
      const taskId = req.params.id;
      const success = await db.deleteTask(taskId);
      if (!success) return res.status(404).json({ error: 'Task not found' });
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(400).json({ error: 'Task not found' });
    }
  });

  // Manage Withdrawals (Approve / Reject)
  app.get('/api/admin/withdrawals', requireAdminAuth, async (req, res) => {
    try {
      const withdrawals = await db.getAllWithdrawals();
      return res.json({ withdrawals });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/admin/withdrawals/:id', requireAdminAuth, async (req, res) => {
    try {
      const withdrawalId = req.params.id;
      const { status, adminNote } = req.body;

      if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'Status must be approved or rejected' });
      }

      const updatedWithdrawal = await db.processWithdrawal(withdrawalId, status, adminNote);
      return res.json({ withdrawal: updatedWithdrawal });
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  });

  // Manage Users
  app.get('/api/admin/users', requireAdminAuth, async (req, res) => {
    try {
      const users = await db.getAllUsers();
      return res.json({ users });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/admin/users/:id/block', requireAdminAuth, async (req, res) => {
    try {
      const userId = req.params.id;
      const { isBlocked } = req.body;
      const user = await db.toggleUserBlockStatus(userId, Boolean(isBlocked));
      return res.json({ user });
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  });

  app.put('/api/admin/users/:id/balance', requireAdminAuth, async (req, res) => {
    try {
      const userId = req.params.id;
      const { balance } = req.body;
      const user = await db.updateUserBalance(userId, Number(balance));
      return res.json({ user });
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  });

  // System Settings Management
  app.get('/api/admin/settings', requireAdminAuth, async (req, res) => {
    try {
      const settings = await db.getSystemSettings();
      return res.json({ settings });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/admin/settings', requireAdminAuth, async (req, res) => {
    try {
      const updates = req.body;
      const settings = await db.updateSystemSettings(updates);
      return res.json({ settings });
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  });

  // Broadcast Notifications
  app.get('/api/admin/broadcasts', requireAdminAuth, async (req, res) => {
    try {
      const broadcasts = await db.getBroadcasts();
      return res.json({ broadcasts });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/admin/broadcasts', requireAdminAuth, async (req, res) => {
    try {
      const { title, message, targetAudience } = req.body;
      if (!title || !message) {
        return res.status(400).json({ error: 'Title and message are required' });
      }
      const broadcast = await db.createBroadcast({ title, message, targetAudience: targetAudience || 'all' });
      return res.json({ broadcast, success: true });
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  });

  // Catch-all for undefined /api/* routes to guarantee JSON response instead of HTML
  app.all('/api/*', (req, res) => {
    return res.status(404).json({ error: `API route not found: ${req.method} ${req.originalUrl}` });
  });

  // Global API error middleware
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('[API Error Middleware]', err);
    if (res.headersSent) return next(err);
    return res.status(500).json({ error: err?.message || 'Internal server error' });
  });

  // Vite Middleware integration for Development / Static serving for Production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`NovaTask Express server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
