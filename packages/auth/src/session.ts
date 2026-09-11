import { db, sessions } from '@pulse/db';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

export interface SessionResult {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

export async function createSession(userId: string, ip: string | null, userAgent: string | null): Promise<SessionResult> {
  const token = crypto.randomUUID();
  const refreshToken = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  await db.insert(sessions).values({
    userId,
    token,
    refreshToken,
    expiresAt,
    ipAddress: ip,
    userAgent,
  });

  return {
    accessToken: token, // This would normally be JWT, but spec asks for both DB and JWT logic mixed in session? Actually we'll just return the JWT from the service layer, but here we store session meta
    refreshToken,
    expiresAt,
  };
}

export async function refreshSession(oldRefreshToken: string): Promise<SessionResult> {
  const sessionRecords = await db.select().from(sessions).where(eq(sessions.refreshToken, oldRefreshToken)).limit(1);
  const session = sessionRecords[0];

  if (!session) {
    throw new Error('Invalid refresh token');
  }

  if (new Date() > session.expiresAt) {
    await db.delete(sessions).where(eq(sessions.id, session.id));
    throw new Error('Refresh token expired');
  }

  const newToken = crypto.randomUUID();
  const newRefreshToken = crypto.randomUUID();
  const newExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await db.update(sessions)
    .set({
      token: newToken,
      refreshToken: newRefreshToken,
      expiresAt: newExpiresAt,
    })
    .where(eq(sessions.id, session.id));

  return {
    accessToken: newToken,
    refreshToken: newRefreshToken,
    expiresAt: newExpiresAt,
  };
}

export async function revokeSession(sessionId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, sessionId));
}

export async function revokeAllSessions(userId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}
