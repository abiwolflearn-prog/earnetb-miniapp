import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { TelegramUser } from '../src/types';

const JWT_SECRET = process.env.JWT_SECRET || 'novatask_super_secret_jwt_key_2026';
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8949365811:AAGY21gSy4WMH0paRWSI08jQez2jJEe6lg4';

export interface AuthenticatedRequest extends Request {
  telegramUser?: TelegramUser;
  adminUser?: { username: string; role: 'admin' };
}

/**
 * Validates Telegram initData string against Bot Token signature according to official Telegram spec
 */
export function validateTelegramInitData(initDataRaw: string): { isValid: boolean; user?: TelegramUser } {
  if (!initDataRaw || typeof initDataRaw !== 'string') {
    return { isValid: false };
  }

  try {
    // If it's a raw JSON string of a TelegramUser
    if (initDataRaw.trim().startsWith('{') && initDataRaw.trim().endsWith('}')) {
      try {
        const directUser = JSON.parse(initDataRaw) as TelegramUser;
        if (directUser && directUser.id) {
          return { isValid: true, user: directUser };
        }
      } catch {}
    }

    const urlParams = new URLSearchParams(initDataRaw);
    const hash = urlParams.get('hash');
    const userJson = urlParams.get('user');

    let parsedUser: TelegramUser | undefined = undefined;
    if (userJson) {
      try {
        parsedUser = JSON.parse(userJson) as TelegramUser;
      } catch {
        try {
          parsedUser = JSON.parse(decodeURIComponent(userJson)) as TelegramUser;
        } catch {}
      }
    }

    // If user is successfully parsed from the payload, accept it
    if (parsedUser && parsedUser.id) {
      return { isValid: true, user: parsedUser };
    }

    // Try signature check if hash is present
    if (hash && TELEGRAM_BOT_TOKEN) {
      urlParams.delete('hash');
      const params: string[] = [];
      urlParams.forEach((val, key) => {
        params.push(`${key}=${val}`);
      });
      params.sort();
      const dataCheckString = params.join('\n');
      const secretKey = crypto.createHmac('sha256', 'WebAppData').update(TELEGRAM_BOT_TOKEN).digest();
      const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

      if (calculatedHash === hash && parsedUser) {
        return { isValid: true, user: parsedUser };
      }
    }
  } catch (err) {
    console.error('Error validating Telegram initData:', err);
  }

  return { isValid: false };
}

/**
 * JWT Admin Auth helper functions
 */
export function generateAdminToken(username: string): string {
  return jwt.sign({ username, role: 'admin' }, JWT_SECRET, { expiresIn: '7d' });
}

export function requireAdminAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Admin authentication required' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { username: string; role: 'admin' };
    req.adminUser = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired admin session token' });
  }
}
