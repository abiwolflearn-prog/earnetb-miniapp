import { BotCommandResponse, TelegramUser } from '../src/types';
import { db } from './db';

const BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME || 'EtNovaTasksbot';

export async function handleBotCommand(command: string, user: TelegramUser, originUrl?: string): Promise<BotCommandResponse> {
  const dbUser = await db.upsertUser({
    telegramId: user.id,
    firstName: user.first_name,
    lastName: user.last_name,
    username: user.username,
    photoUrl: user.photo_url
  });

  // App URL: prioritize configured APP_URL or current request origin, fallback to direct environment domain
  const appUrl = process.env.APP_URL || originUrl || 'https://ais-dev-fezoxbfnnmdowei4zqqvdi-529287111346.europe-west1.run.app';

  const cmdClean = command.trim().toLowerCase().split(' ')[0];

  switch (cmdClean) {
    case '/start': {
      return {
        command: '/start',
        text: `⚡ *Welcome to EarnBirr, ${user.first_name}!* ⚡\n\nEarnBirr is Ethiopia's premier Telegram Mini App for task earnings and daily Birr rewards.\n\n💰 *Your Current Balance:* ${dbUser.balance.toLocaleString()} Birr\n⭐ *Your Points:* ${dbUser.points.toLocaleString()} PTS\n👥 *Your Referrals:* ${dbUser.referralsCount} friends\n\nComplete social tasks, quizzes, daily check-ins, and withdraw instantly to *Telebirr* or *CBE Birr*!`,
        inlineKeyboard: [
          [
            {
              text: '🚀 Start EarnBirr',
              web_app: { url: appUrl }
            }
          ],
          [
            { text: '📋 View Earn Tasks', callback_data: 'tasks' },
            { text: '💳 Wallet & Cashout', callback_data: 'withdraw' }
          ],
          [
            { text: '📢 Official Channel', url: 'https://t.me/NovaTaskOfficial' }
          ]
        ]
      };
    }

    case '/help': {
      return {
        command: '/help',
        text: `❓ *EarnBirr Help & FAQ Guide*\n\n1️⃣ *How do I earn Birr & Points?*\nTap 'Start EarnBirr' to view tasks like Telegram channels, video tutorials, articles, and daily quizzes.\n\n2️⃣ *How does withdrawal work?*\nMinimum cashout threshold is *2,000 Birr*. Payment options include *Telebirr*, *CBE Birr*, and *Bank Transfer*.\n\n3️⃣ *How much do I earn per referral?*\nEarn *50 Birr + 500 Points* for every friend you invite using your referral link!`,
        inlineKeyboard: [
          [
            { text: '🚀 Start EarnBirr', web_app: { url: appUrl } }
          ],
          [
            { text: '💬 Support Group', url: 'https://t.me/NovaTaskSupport' }
          ]
        ]
      };
    }

    case '/profile': {
      return {
        command: '/profile',
        text: `👤 *EarnBirr Account Overview*\n\n• *Name:* ${dbUser.firstName} ${dbUser.lastName || ''}\n• *Telegram ID:* \`${dbUser.telegramId}\`\n• *Username:* @${dbUser.username}\n• *Available Balance:* *${dbUser.balance.toLocaleString()} Birr*\n• *Total Points:* ${dbUser.points.toLocaleString()} PTS\n• *Daily Streak:* ${dbUser.dailyStreak} Days 🔥\n• *Total Invited:* ${dbUser.referralsCount} friends\n\n🔗 *Your Referral Link:*\n\`https://t.me/${BOT_USERNAME}/app?startapp=${dbUser.referralCode}\``,
        inlineKeyboard: [
          [
            { text: '🚀 Open EarnBirr Profile', web_app: { url: appUrl } }
          ],
          [
            { text: '📤 Share Referral Link', url: `https://t.me/share/url?url=https://t.me/${BOT_USERNAME}/app?startapp=${dbUser.referralCode}&text=Join%20EarnBirr%20and%20earn%20Telebirr%20rewards!` }
          ]
        ]
      };
    }

    case '/tasks': {
      const tasks = await db.getTasks();
      const activeTasks = tasks.filter(t => t.status === 'active').slice(0, 5);

      let taskListText = `🎯 *Top Available Earning Tasks:*\n\n`;
      activeTasks.forEach((t, i) => {
        taskListText += `${i + 1}. *${t.title}*\n   💵 Reward: *+${t.rewardBirr} Birr* (${t.rewardPoints} PTS)\n   🏷️ Category: ${t.category.toUpperCase()}\n\n`;
      });

      return {
        command: '/tasks',
        text: taskListText,
        inlineKeyboard: [
          [
            { text: '✨ Complete Tasks in EarnBirr', web_app: { url: appUrl } }
          ]
        ]
      };
    }

    case '/withdraw': {
      const isEligible = dbUser.balance >= 2000;
      return {
        command: '/withdraw',
        text: `💳 *EarnBirr Withdrawal Center*\n\n• *Available Balance:* ${dbUser.balance.toLocaleString()} Birr\n• *Minimum Cashout:* 2,000 Birr\n• *Supported Methods:* Telebirr, CBE Birr, Bank Transfer\n\n${isEligible ? '✅ *Status: Eligible for instant withdrawal!*' : '⚠️ *Status: You need ' + (2000 - dbUser.balance) + ' more Birr to cash out.*'}`,
        inlineKeyboard: [
          [
            { text: '💸 Open Cashout Form in EarnBirr', web_app: { url: appUrl } }
          ]
        ]
      };
    }

    default:
      return {
        command: command,
        text: `Command not recognized. Use /start, /help, /profile, /tasks, or /withdraw.`,
        inlineKeyboard: [
          [
            { text: '🚀 Start EarnBirr', web_app: { url: appUrl } }
          ]
        ]
      };
  }
}
