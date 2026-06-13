/**
 * Tarsul - تراسل | Database-Backed Session Store
 * Sessions persist in SQLite via Prisma — survives server restarts and HMR.
 */

import { db } from '@/lib/db';
import { generateSessionToken } from './auth';

export interface SessionData {
  userId: string;
  expiresAt: number;
}

export async function createSession(userId: string, durationMs: number = 30 * 24 * 60 * 60 * 1000): Promise<{ token: string; session: SessionData }> {
  const token = generateSessionToken();
  const expiresAt = Date.now() + durationMs;

  await db.session.create({
    data: {
      token,
      userId,
      expiresAt: new Date(expiresAt),
    },
  });

  const session: SessionData = { userId, expiresAt };
  return { token, session };
}

export async function getSession(token: string): Promise<SessionData | null> {
  try {
    const record = await db.session.findUnique({
      where: { token },
    });

    if (!record) return null;

    // Check expiration
    if (record.expiresAt.getTime() < Date.now()) {
      // Clean up expired session
      db.session.delete({ where: { id: record.id } }).catch(() => {});
      return null;
    }

    return {
      userId: record.userId,
      expiresAt: record.expiresAt.getTime(),
    };
  } catch (error) {
    console.error('Session lookup error:', error);
    return null;
  }
}

export async function deleteSession(token: string): Promise<void> {
  await db.session.deleteMany({ where: { token } }).catch(() => {});
}

export async function cleanupExpiredSessions(): Promise<number> {
  const result = await db.session.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
    },
  });
  return result.count;
}

// Clean up expired sessions every 10 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    cleanupExpiredSessions().catch(() => {});
  }, 10 * 60 * 1000);
}