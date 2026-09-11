import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { db, users } from '@pulse/db';
import { eq } from 'drizzle-orm';
import { changePassword } from '@pulse/auth';
import { NotFoundError } from '@pulse/core';

export const usersRouter: Router = Router();

usersRouter.get('/me', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const userRecords = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!userRecords.length) {
      throw new NotFoundError('User not found');
    }
    res.json({ success: true, data: userRecords[0] });
  } catch (error) {
    next(error);
  }
});

usersRouter.patch('/me', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const { name, avatarUrl } = req.body;
    
    const [updatedUser] = await db.update(users)
      .set({ name, avatarUrl, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
      
    res.json({ success: true, data: updatedUser });
  } catch (error) {
    next(error);
  }
});

usersRouter.patch('/me/password', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const { oldPassword, newPassword } = req.body;
    
    await changePassword(userId, oldPassword, newPassword);
    res.json({ success: true, data: { message: 'Password updated successfully' } });
  } catch (error) {
    next(error);
  }
});
