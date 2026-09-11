export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'action';

export interface Notification {
  id: string;
  userId: string;
  workspaceId?: string | null;
  source: string;
  type: NotificationType;
  title: string;
  body?: string | null;
  data: Record<string, unknown>;
  read: boolean;
  readAt?: string | Date | null;
  createdAt: string | Date;
}

export interface DeviceToken {
  id: string;
  userId: string;
  token: string;
  platform: 'ios' | 'android' | 'web';
  deviceName?: string | null;
  lastUsedAt?: string | Date | null;
  createdAt: string | Date;
}
