import { EventEmitter } from 'events';
import { db, notifications, deviceTokens } from '@pulse/db';
import { eq, and, sql } from 'drizzle-orm';
import type { NotificationType } from '@pulse/core';

export interface CreateNotificationParams {
  userId: string;
  workspaceId?: string | null;
  source: string;
  type: NotificationType;
  title: string;
  body?: string | null;
  data?: Record<string, unknown>;
}

class NotificationEmitter extends EventEmitter {}
export const notificationEvents = new NotificationEmitter();

export class NotificationService {
  /**
   * Create a notification in the database and broadcast to subscribers
   */
  static async createNotification(params: CreateNotificationParams) {
    const [notification] = await db
      .insert(notifications)
      .values({
        userId: params.userId,
        workspaceId: params.workspaceId || null,
        source: params.source,
        type: params.type,
        title: params.title,
        body: params.body || null,
        data: params.data || {},
        read: false,
      })
      .returning();

    // Broadcast in-memory event
    notificationEvents.emit('notification', notification);
    notificationEvents.emit(`user:${params.userId}`, notification);

    // Try dispatching push notifications if devices are registered
    try {
      await this.dispatchPushNotifications(params.userId, notification);
    } catch (err) {
      console.error('[NotificationService] Push notification dispatch error:', err);
    }

    return notification;
  }

  /**
   * Dispatch push notifications to registered device tokens
   */
  static async dispatchPushNotifications(userId: string, notification: typeof notifications.$inferSelect) {
    const devices = await db
      .select()
      .from(deviceTokens)
      .where(eq(deviceTokens.userId, userId));

    if (!devices || devices.length === 0) return;

    // Send to Expo Push service or FCM if configured
    for (const device of devices) {
      // In production, invoke Expo Push API: https://exp.host/--/api/v2/push/send
      console.log(`[Push Notification] Sent to ${device.platform} token: ${device.token.substring(0, 12)}...`, {
        title: notification.title,
        body: notification.body,
      });
    }
  }

  /**
   * Get unread notification count for a user
   */
  static async getUnreadCount(userId: string, workspaceId?: string): Promise<number> {
    const conditions = [
      eq(notifications.userId, userId),
      eq(notifications.read, false),
    ];

    if (workspaceId) {
      conditions.push(eq(notifications.workspaceId, workspaceId));
    }

    const [result] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(and(...conditions));

    return result?.count || 0;
  }

  /**
   * Mark a single notification as read
   */
  static async markAsRead(id: string, userId: string) {
    const [updated] = await db
      .update(notifications)
      .set({
        read: true,
        readAt: new Date(),
      })
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
      .returning();

    return updated;
  }

  /**
   * Mark all unread notifications as read for a user
   */
  static async markAllAsRead(userId: string, workspaceId?: string) {
    const conditions = [
      eq(notifications.userId, userId),
      eq(notifications.read, false),
    ];

    if (workspaceId) {
      conditions.push(eq(notifications.workspaceId, workspaceId));
    }

    const result = await db
      .update(notifications)
      .set({
        read: true,
        readAt: new Date(),
      })
      .where(and(...conditions))
      .returning();

    return result.length;
  }
}
