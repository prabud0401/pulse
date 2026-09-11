import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { db, notifications, deviceTokens } from '@pulse/db';
import { eq, and, desc, sql } from 'drizzle-orm';
import { NotFoundError, ValidationError } from '@pulse/core';
import { NotificationService } from '../services/notification-service';

export const notificationsRouter: Router = Router();

// GET /api/notifications — list notifications for user
notificationsRouter.get('/', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const offset = (page - 1) * limit;
    const readParam = req.query.read as string | undefined;
    const workspaceId = req.query.workspaceId as string | undefined;

    const conditions = [eq(notifications.userId, userId)];

    if (readParam !== undefined) {
      conditions.push(eq(notifications.read, readParam === 'true'));
    }

    if (workspaceId) {
      conditions.push(eq(notifications.workspaceId, workspaceId));
    }

    const whereClause = and(...conditions);

    const [items, totalResult, unreadCount] = await Promise.all([
      db
        .select()
        .from(notifications)
        .where(whereClause)
        .orderBy(desc(notifications.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(notifications)
        .where(whereClause),
      NotificationService.getUnreadCount(userId, workspaceId),
    ]);

    const total = totalResult[0]?.count || 0;

    res.json({
      success: true,
      data: items,
      unreadCount,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/notifications/:id/read — mark single as read
notificationsRouter.patch('/:id/read', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const updated = await NotificationService.markAsRead(id, userId);

    if (!updated) {
      throw new NotFoundError('Notification not found');
    }

    const unreadCount = await NotificationService.getUnreadCount(userId);

    res.json({ success: true, data: updated, unreadCount });
  } catch (error) {
    next(error);
  }
});

// POST /api/notifications/read-all — mark all as read
notificationsRouter.post('/read-all', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const { workspaceId } = req.body || {};

    const updatedCount = await NotificationService.markAllAsRead(userId, workspaceId);

    res.json({ success: true, data: { markedCount: updatedCount, unreadCount: 0 } });
  } catch (error) {
    next(error);
  }
});

// POST /api/notifications/devices — register device push token
notificationsRouter.post('/devices', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const { token, platform, deviceName } = req.body;

    if (!token || !platform) {
      throw new ValidationError('token and platform are required');
    }

    if (!['ios', 'android', 'web'].includes(platform)) {
      throw new ValidationError('platform must be ios, android, or web');
    }

    // Upsert device token
    const [existing] = await db
      .select()
      .from(deviceTokens)
      .where(eq(deviceTokens.token, token))
      .limit(1);

    let device;
    if (existing) {
      [device] = await db
        .update(deviceTokens)
        .set({
          userId,
          platform,
          deviceName: deviceName || existing.deviceName,
          lastUsedAt: new Date(),
        })
        .where(eq(deviceTokens.token, token))
        .returning();
    } else {
      [device] = await db
        .insert(deviceTokens)
        .values({
          userId,
          token,
          platform,
          deviceName: deviceName || null,
        })
        .returning();
    }

    res.status(201).json({ success: true, data: device });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/notifications/devices/:token — unregister device push token
notificationsRouter.delete('/devices/:token', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const { token } = req.params;

    await db
      .delete(deviceTokens)
      .where(and(eq(deviceTokens.token, token), eq(deviceTokens.userId, userId)));

    res.json({ success: true, data: { token } });
  } catch (error) {
    next(error);
  }
});
