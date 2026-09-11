import { db, users } from '@pulse/db';
import { eq } from 'drizzle-orm';
import { hashPassword, verifyPassword } from './password';
import { generateAccessToken } from './jwt';
import { createSession } from './session';
import { NotFoundError, UnauthorizedError, ConflictError } from '@pulse/core';

export async function register(email: string, password: string, name: string | null = null, ip: string | null = null, userAgent: string | null = null) {
  const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existingUser.length > 0) {
    throw new ConflictError('Email already in use');
  }

  const hashedPassword = await hashPassword(password);
  
  const [newUser] = await db.insert(users).values({
    email,
    name,
    passwordHash: hashedPassword,
  }).returning();

  const session = await createSession(newUser.id, ip, userAgent);
  const tokenPayload = { userId: newUser.id, email: newUser.email };
  
  const accessToken = generateAccessToken(tokenPayload);

  return {
    user: newUser,
    session: {
      accessToken,
      refreshToken: session.refreshToken,
      expiresAt: session.expiresAt
    }
  };
}

export async function login(email: string, password: string, ip: string | null = null, userAgent: string | null = null) {
  const existingUsers = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const user = existingUsers[0];

  if (!user || !user.passwordHash) {
    throw new UnauthorizedError('Invalid credentials');
  }

  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    throw new UnauthorizedError('Invalid credentials');
  }

  const session = await createSession(user.id, ip, userAgent);
  const tokenPayload = { userId: user.id, email: user.email };
  
  return {
    user,
    session: {
      accessToken: generateAccessToken(tokenPayload),
      refreshToken: session.refreshToken,
      expiresAt: session.expiresAt
    }
  };
}

export async function getCurrentUser(userId: string) {
  const existingUsers = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return existingUsers[0] || null;
}

export async function changePassword(userId: string, oldPassword: string, newPassword: string) {
  const existingUsers = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const user = existingUsers[0];

  if (!user || !user.passwordHash) {
    throw new NotFoundError('User not found or has no password');
  }

  const isValid = await verifyPassword(oldPassword, user.passwordHash);
  if (!isValid) {
    throw new UnauthorizedError('Invalid old password');
  }

  const newHash = await hashPassword(newPassword);
  await db.update(users).set({ passwordHash: newHash }).where(eq(users.id, userId));
}
